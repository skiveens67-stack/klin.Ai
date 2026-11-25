import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin, readLimitedJson } from "@/lib/request-security";
import { hashSecurityCode, recordSecurityEvent, safeCodeMatch } from "@/lib/account-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  const parsed = await readLimitedJson(request, 4096);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  if (!isRecord(parsed.value)) return NextResponse.json({ error: "Invalid verification request." }, { status: 400 });

  const challengeId = typeof parsed.value.challengeId === "string" ? parsed.value.challengeId : "";
  const code = typeof parsed.value.code === "string" ? parsed.value.code : "";
  const newPassword = typeof parsed.value.newPassword === "string" ? parsed.value.newPassword : "";
  if (!/^[0-9a-f-]{36}$/i.test(challengeId) || !/^\d{6}$/.test(code)) return NextResponse.json({ error: "Enter the six-digit security code." }, { status: 400 });

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const admin = createSupabaseAdminClient();
    const { data: challenge, error: challengeError } = await admin.from("klin_security_change_challenges")
      .select("id,user_id,change_type,new_email,code_hash,expires_at,attempts,consumed_at")
      .eq("id", challengeId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (challengeError || !challenge) return NextResponse.json({ error: "Verification request not found. Start again." }, { status: 404 });
    if (challenge.consumed_at || new Date(challenge.expires_at).getTime() <= Date.now() || challenge.attempts >= 5) {
      return NextResponse.json({ error: "This security code expired or can no longer be used. Start again." }, { status: 410 });
    }
    if (challenge.change_type === "password" && (newPassword.length < 8 || newPassword.length > 128)) {
      return NextResponse.json({ error: "New password must be between 8 and 128 characters." }, { status: 400 });
    }
    if (challenge.change_type === "email" && newPassword) return NextResponse.json({ error: "Unexpected password value." }, { status: 400 });

    const suppliedHash = hashSecurityCode(user.id, challengeId, code);
    if (!safeCodeMatch(challenge.code_hash, suppliedHash)) {
      const attempts = challenge.attempts + 1;
      await admin.from("klin_security_change_challenges").update({
        attempts,
        consumed_at: attempts >= 5 ? new Date().toISOString() : null,
      }).eq("id", challengeId);
      await recordSecurityEvent(user.id, "sensitive_change_verification_failed", "blocked", {
        changeType: challenge.change_type,
        attempts,
      });
      return NextResponse.json({ error: attempts >= 5 ? "Too many incorrect codes. Start a new request." : "That code is incorrect." }, { status: 400 });
    }

    const { data: protectedAccount, error: protectedError } = await admin.from("klin_protected_accounts")
      .select("account_type,state")
      .eq("user_id", user.id)
      .maybeSingle();
    if (protectedError || protectedAccount?.state === "locked") return NextResponse.json({ error: "Protected-account checks failed. No change was made." }, { status: 423 });
    if (protectedAccount) {
      const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance?.currentLevel !== "aal2") return NextResponse.json({ error: "Complete multi-factor authentication before continuing." }, { status: 403 });
    }

    const consumedAt = new Date().toISOString();
    const { data: consumed, error: consumeError } = await admin.from("klin_security_change_challenges")
      .update({ verified_at: consumedAt, consumed_at: consumedAt })
      .eq("id", challengeId)
      .eq("user_id", user.id)
      .is("consumed_at", null)
      .select("id")
      .maybeSingle();
    if (consumeError || !consumed) return NextResponse.json({ error: "This code has already been used. Start again." }, { status: 409 });

    const update = challenge.change_type === "email"
      ? await supabase.auth.updateUser({ email: challenge.new_email! })
      : await supabase.auth.updateUser({ password: newPassword });
    if (update.error) {
      await recordSecurityEvent(user.id, "sensitive_change_commit_failed", "failed", { changeType: challenge.change_type });
      return NextResponse.json({ error: update.error.message || "Klin could not apply the verified change. Start again." }, { status: 400 });
    }

    await recordSecurityEvent(user.id, "sensitive_change_verified_and_submitted", "allowed", {
      changeType: challenge.change_type,
      accountType: protectedAccount?.account_type ?? "standard",
    });
    return NextResponse.json({
      success: true,
      message: challenge.change_type === "email"
        ? "Verification passed. Supabase has sent its email-change confirmation links. Your sign-in email changes only after those links are confirmed."
        : "Verification passed. Your password has been updated.",
    }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Account security service is unavailable. No change was made." }, { status: 503 });
  }
}
