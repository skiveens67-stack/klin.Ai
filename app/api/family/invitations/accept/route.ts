import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasTrustedOrigin, readLimitedJson } from "@/lib/request-security";
import { hashFamilyInvitationToken, normalizeInvitationEmail } from "@/lib/family-invitations";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  const parsed = await readLimitedJson(request, 4096);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return NextResponse.json({ error: "Invalid invitation acceptance request." }, { status: 400 });
  }
  const input = parsed.value as Record<string, unknown>;
  if (Object.keys(input).some((key) => key !== "token") || typeof input.token !== "string" ||
      input.token.length < 32 || input.token.length > 128 || !/^[A-Za-z0-9_-]+$/.test(input.token)) {
    return NextResponse.json({ error: "A valid invitation token is required." }, { status: 400 });
  }

  try {
    const sessionClient = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await sessionClient.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    if (!user.email || !user.email_confirmed_at) {
      return NextResponse.json({ error: "Verify your email before accepting a family invitation." }, { status: 403 });
    }

    const admin = createSupabaseAdminClient();
    const tokenHash = hashFamilyInvitationToken(input.token);
    const { data: invitation, error: lookupError } = await admin.from("family_invitations")
      .select("id,family_id,invited_email,role,expires_at,accepted_at,revoked_at")
      .eq("token_hash", tokenHash).maybeSingle();
    if (lookupError) return NextResponse.json({ error: "Unable to verify invitation." }, { status: 503 });
    if (!invitation || invitation.revoked_at || invitation.accepted_at ||
        new Date(invitation.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: "This invitation is invalid, expired, revoked, or already used." }, { status: 410 });
    }
    if (normalizeInvitationEmail(user.email) !== normalizeInvitationEmail(invitation.invited_email)) {
      return NextResponse.json({ error: "Sign in with the verified email address this invitation was sent to." }, { status: 403 });
    }

    const acceptedAt = new Date().toISOString();
    const { data: claimed, error: claimError } = await admin.from("family_invitations")
      .update({ accepted_at: acceptedAt })
      .eq("id", invitation.id).is("accepted_at", null).is("revoked_at", null)
      .gt("expires_at", acceptedAt).select("id").maybeSingle();
    if (claimError) return NextResponse.json({ error: "Unable to accept invitation." }, { status: 503 });
    if (!claimed) return NextResponse.json({ error: "This invitation has already been used or expired." }, { status: 410 });

    const { data: member, error: memberError } = await admin.from("family_members").insert({
      family_id: invitation.family_id,
      user_id: user.id,
      role: invitation.role,
      status: "active",
      permissions: {},
    }).select("id,family_id,role,status,created_at").single();

    if (memberError) {
      if (memberError.code === "23505") {
        return NextResponse.json({ error: "This account is already a member of the family." }, { status: 409 });
      }
      await admin.from("family_invitations").update({ accepted_at: null })
        .eq("id", invitation.id).eq("accepted_at", acceptedAt);
      return NextResponse.json({ error: "Unable to add your account to the family." }, { status: 503 });
    }

    return NextResponse.json({ membership: member }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Family invitation service unavailable." }, { status: 503 });
  }
}
