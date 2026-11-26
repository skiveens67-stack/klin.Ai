import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin, readLimitedJson } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const { data, error } = await supabase
      .from("families")
      .select("id,name,created_at,updated_at,managed_profiles(id,display_name,age_band,avatar_url,controls,created_at),family_members(id,user_id,managed_profile_id,role,status,permissions,created_at)")
      .eq("owner_user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: "Unable to load family data." }, { status: 500 });
    return NextResponse.json({ families: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Family service unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });

  try {
    const parsed = await readLimitedJson(request, 4096);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    const body: unknown = parsed.value;
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    const name = (body as Record<string, unknown>).name;
    if (typeof name !== "string" || name.trim().length < 1 || name.trim().length > 80) {
      return NextResponse.json({ error: "Family name must be 1–80 characters." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const { data: existing, error: existingError } = await supabase
      .from("families").select("id").eq("owner_user_id", user.id).limit(1);
    if (existingError) return NextResponse.json({ error: "Unable to verify family limit." }, { status: 500 });
    if ((existing ?? []).length >= 1) return NextResponse.json({ error: "An account can currently own one family." }, { status: 409 });

    const { data, error } = await supabase
      .from("families").insert({ owner_user_id: user.id, name: name.trim() })
      .select("id,name,created_at").single();
    if (error?.code === "23505") return NextResponse.json({ error: "An account can currently own one family." }, { status: 409 });
    if (error) return NextResponse.json({ error: "Unable to create family." }, { status: 500 });

    return NextResponse.json({ family: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Invalid request or family service unavailable." }, { status: 400 });
  }
}
