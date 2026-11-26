import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin, readLimitedJson } from "@/lib/request-security";
import { validateFamilyMemberUpdate } from "@/lib/family-member-permissions";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ memberId: string }> };

export async function PATCH(request: Request, context: Context) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  const { memberId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(memberId)) return NextResponse.json({ error: "Invalid family member id." }, { status: 400 });
  const parsed = await readLimitedJson(request, 4096);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const validation = validateFamilyMemberUpdate(parsed.value);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data: family, error: familyError } = await supabase
      .from("families").select("id").eq("owner_user_id", user.id).maybeSingle();
    if (familyError) return NextResponse.json({ error: "Unable to verify family ownership." }, { status: 500 });
    if (!family) return NextResponse.json({ error: "Family not found." }, { status: 404 });

    const { data: current, error: lookupError } = await supabase.from("family_members")
      .select("id,role,permissions").eq("id", memberId).eq("family_id", family.id).maybeSingle();
    if (lookupError) return NextResponse.json({ error: "Unable to load family member." }, { status: 500 });
    if (!current) return NextResponse.json({ error: "Family member not found." }, { status: 404 });
    if (current.role === "owner") return NextResponse.json({ error: "The family owner role cannot be changed." }, { status: 403 });

    const nextPermissions = validation.permissions
      ? { ...((current.permissions && typeof current.permissions === "object" && !Array.isArray(current.permissions)) ? current.permissions as Record<string, unknown> : {}), ...validation.permissions }
      : undefined;
    const update: Record<string, unknown> = {};
    if (validation.role) update.role = validation.role;
    if (nextPermissions) update.permissions = nextPermissions;

    const { data, error } = await supabase.from("family_members").update(update)
      .eq("id", memberId).eq("family_id", family.id)
      .select("id,user_id,managed_profile_id,role,status,permissions,updated_at").single();
    if (error) return NextResponse.json({ error: "Unable to update family member permissions." }, { status: 500 });
    return NextResponse.json({ member: data }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Family member service unavailable." }, { status: 503 });
  }
}

export async function DELETE(request: Request, context: Context) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  const { memberId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(memberId)) return NextResponse.json({ error: "Invalid family member id." }, { status: 400 });

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data: family, error: familyError } = await supabase
      .from("families").select("id").eq("owner_user_id", user.id).maybeSingle();
    if (familyError) return NextResponse.json({ error: "Unable to verify family ownership." }, { status: 500 });
    if (!family) return NextResponse.json({ error: "Family not found." }, { status: 404 });

    const { data, error } = await supabase.from("family_members").delete()
      .eq("id", memberId).eq("family_id", family.id).neq("role", "owner")
      .select("id").maybeSingle();
    if (error) return NextResponse.json({ error: "Unable to remove family member." }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Removable family member not found." }, { status: 404 });
    return NextResponse.json({ removed: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Family member service unavailable." }, { status: 503 });
  }
}
