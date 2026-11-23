import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin, readLimitedJson } from "@/lib/request-security";
import {
  createFamilyInvitationToken,
  getFamilyInvitationExpiry,
  normalizeInvitationEmail,
} from "@/lib/family-invitations";

export const dynamic = "force-dynamic";

const INVITABLE_ROLES = ["administrator", "parent_guardian", "member"];

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const { data: family, error: familyError } = await supabase
      .from("families").select("id").eq("owner_user_id", user.id).maybeSingle();
    if (familyError) return NextResponse.json({ error: "Unable to load family invitations." }, { status: 500 });
    if (!family) return NextResponse.json({ invitations: [] }, { headers: { "Cache-Control": "no-store" } });

    const { data, error } = await supabase.from("family_invitations")
      .select("id,invited_email,role,expires_at,accepted_at,revoked_at,created_at")
      .eq("family_id", family.id).order("created_at", { ascending: false }).limit(50);
    if (error) return NextResponse.json({ error: "Unable to load family invitations." }, { status: 500 });
    return NextResponse.json({ invitations: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Family invitation service unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  const parsed = await readLimitedJson(request, 4096);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return NextResponse.json({ error: "Invalid invitation request." }, { status: 400 });
  }

  const input = parsed.value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !["email", "role"].includes(key))) {
    return NextResponse.json({ error: "Unexpected invitation field." }, { status: 400 });
  }
  if (typeof input.email !== "string" || input.email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  const role = input.role === undefined ? "member" : input.role;
  if (typeof role !== "string" || !INVITABLE_ROLES.includes(role)) {
    return NextResponse.json({ error: "Choose a supported family role." }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const { data: family, error: familyError } = await supabase
      .from("families").select("id,name").eq("owner_user_id", user.id).maybeSingle();
    if (familyError) return NextResponse.json({ error: "Unable to verify family ownership." }, { status: 500 });
    if (!family) return NextResponse.json({ error: "Create a family before inviting members." }, { status: 409 });

    const invitedEmail = normalizeInvitationEmail(input.email);
    if (user.email && normalizeInvitationEmail(user.email) === invitedEmail) {
      return NextResponse.json({ error: "You cannot invite your own account." }, { status: 400 });
    }

    const { token, tokenHash } = createFamilyInvitationToken();
    const expiresAt = getFamilyInvitationExpiry();
    const { data, error } = await supabase.from("family_invitations").insert({
      family_id: family.id,
      invited_by_user_id: user.id,
      invited_email: invitedEmail,
      role,
      token_hash: tokenHash,
      expires_at: expiresAt,
    }).select("id,invited_email,role,expires_at,created_at").single();

    if (error) return NextResponse.json({ error: "Unable to create family invitation." }, { status: 500 });
    return NextResponse.json({
      invitation: data,
      invite_token: token,
      acceptance_endpoint: "/api/family/invitations/accept",
      note: "Share this token securely with the invited person. It is shown only once; acceptance requires a signed-in account with a verified matching email address.",
    }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Family invitation service unavailable." }, { status: 503 });
  }
}
