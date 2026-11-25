import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin, readLimitedJson } from "@/lib/request-security";
import { createSecurityCode, hashSecurityCode, recordSecurityEvent, sendSecurityChangeCode } from "@/lib/account-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  const parsed = await readLimitedJson(request, 4096);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  if (!isRecord(parsed.value)) return NextResponse.json({ error: "Invalid security-change request." }, { status: 400 });

  const changeType = parsed.value.changeType;
  const currentPassword = parsed.value.currentPassword;
  const newEmail = typeof parsed.value.newEmail === "string" ? parsed.value.newEmail.trim().toLowerCase() : null;
  if (changeType !== "email" && changeType !== "password") return NextResponse.json({ error: "Unsupported account change." }, { status: 400 });
  if (typeof currentPassword !== "string" || currentPassword.length < 1 || currentPassword.length > 128) {
    return NextResponse.json({ error: "Enter your current password." }, { status: 400 });
  }
  if (changeType === "email" && (!newEmail || newEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail))) {
    return NextResponse.json({ error: "Enter a valid new email address." }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.email) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    if (!user.email_confirmed_at) return NextResponse.json({ error: "Verify your current email before changing account security details." }, { status: 403 });
    if (changeType === "email" && newEmail === user.email.toLowerCase()) return NextResponse.json({ error: "That is already your current email address." }, { status: 400 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return NextResponse.json({ error: "Account security is not configured." }, { status: 503 });
    const verifier = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: verified, error: passwordError } = await verifier.auth.signInWithPassword({ email: user.email, password: currentPassword });
    if (passwordError || verified.user?.id !== user.id) {
      await recordSecurityEvent(user.id, "sensitive_change_reauthentication_failed", "blocked", { changeType });
      return NextResponse.json({ error: "Your current password could not be verified." }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();
    const { data: protectedAccount, error: protectedError } = await admin
      .from("klin_protected_accounts")
      .select("account_type,security_email,security_email_verified_at,state")
      .eq("user_id", user.id)
      .maybeSingle();
    if (protectedError) return NextResponse.json({ error: "Unable to verify protected-account settings. No change was made." }, { status: 503 });
    if (protectedAccount?.state === "locked") return NextResponse.json({ error: "This protected account is temporarily locked. Use the secure recovery process." }, { status: 423 });

    let recipient = user.email;
    if (protectedAccount) {
      if (!protectedAccount.security_email_verified_at || !protectedAccount.security_email) {
        await recordSecurityEvent(user.id, "sensitive_change_blocked_missing_security_email", "blocked", { changeType, accountType: protectedAccount.account_type });
        return NextResponse.json({ error: "This protected account has no verified security email. No change was made." }, { status: 423 });
      }
      recipient = protectedAccount.security_email;
      const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance?.currentLevel !== "aal2") return NextResponse.json({ error: "Complete multi-factor authentication before changing a protected account." }, { status: 403 });
    }

    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count, error: rateError } = await admin.from("klin_security_change_challenges")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", since)
      .is("consumed_at", null);
    if (rateError) return NextResponse.json({ error: "Unable to start security verification. No change was made." }, { status: 503 });
    if ((count ?? 0) >= 3) return NextResponse.json({ error: "Too many verification requests. Wait 15 minutes and try again." }, { status: 429 });

    const challengeId = randomUUID();
    const code = createSecurityCode();
    const { error: insertError } = await admin.from("klin_security_change_challenges").insert({
      id: challengeId,
      user_id: user.id,
      change_type: changeType,
      new_email: changeType === "email" ? newEmail : null,
      code_hash: hashSecurityCode(user.id, challengeId, code),
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    if (insertError) return NextResponse.json({ error: "Unable to create a verification request. No change was made." }, { status: 503 });

    try {
      await sendSecurityChangeCode({ to: recipient, code, changeType, challengeId });
    } catch {
      await admin.from("klin_security_change_challenges").update({ consumed_at: new Date().toISOString() }).eq("id", challengeId);
      await recordSecurityEvent(user.id, "sensitive_change_code_delivery_failed", "failed", { changeType });
      return NextResponse.json({ error: "Klin could not send the security code. No change was made." }, { status: 502 });
    }

    await recordSecurityEvent(user.id, "sensitive_change_verification_requested", "pending", {
      changeType,
      accountType: protectedAccount?.account_type ?? "standard",
    });
    return NextResponse.json({
      challengeId,
      message: "A one-time code was sent to your verified security email. The change is still pending and has not been saved.",
    }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Account security service is unavailable. No change was made." }, { status: 503 });
  }
}
