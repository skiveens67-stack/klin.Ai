import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getKlinAppOrigin } from "@/lib/app-url";
import { hasTrustedOrigin, readLimitedJson } from "@/lib/request-security";

export const dynamic = "force-dynamic";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  const parsed = await readLimitedJson(request, 4096);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return NextResponse.json({ error: "Invalid signup request." }, { status: 400 });
  }

  const input = parsed.value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !["email", "password"].includes(key))) {
    return NextResponse.json({ error: "Unexpected signup field." }, { status: 400 });
  }
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: "Password must be between 8 and 128 characters." }, { status: 400 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return NextResponse.json({ error: "Klin email verification is not configured. Contact Klin support." }, { status: 503 });

  try {
    const origin = getKlinAppOrigin();
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: { redirectTo: `${origin}/auth/confirm` },
    });
    if (error || !data.properties?.hashed_token || !data.properties.verification_type || !data.user?.id) {
      return NextResponse.json({ error: "Unable to create your verification link. Check the address or try signing in if you already have an account." }, { status: 400 });
    }

    const confirmUrl = new URL("/auth/confirm", origin);
    confirmUrl.searchParams.set("token_hash", data.properties.hashed_token);
    confirmUrl.searchParams.set("type", data.properties.verification_type);
    const from = process.env.KLIN_EMAIL_FROM || "Klin <no-reply@klin.website>";
    const replyTo = process.env.KLIN_SUPPORT_EMAIL || "support@klin.help";
    const safeUrl = escapeHtml(confirmUrl.toString());
    const safeEmail = escapeHtml(email);
    const html = `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Verify your Klin email</title></head><body style="margin:0;background:#080d18;color:#e8efff;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#080d18;padding:32px 12px"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#111a2b;border:1px solid #263653;border-radius:16px"><tr><td style="padding:32px"><p style="font-size:13px;line-height:20px;color:#91a6c8;margin:0 0 12px">KLIN ACCOUNT SECURITY</p><h1 style="font-size:26px;line-height:34px;color:#ffffff;margin:0 0 16px">Verify your email</h1><p style="font-size:15px;line-height:24px;color:#c7d4ea;margin:0 0 24px">Confirm that ${safeEmail} belongs to you to finish creating your Klin account.</p><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#5b8cff" style="border-radius:9px"><a href="${safeUrl}" style="display:inline-block;padding:13px 22px;color:#ffffff;text-decoration:none;font-size:14px;line-height:20px;font-weight:bold">Verify email address</a></td></tr></table><p style="font-size:12px;line-height:19px;color:#91a6c8;margin:24px 0 0">If you did not create this account, you can ignore this email. This link is single-use and expires automatically.</p></td></tr></table></td></tr></table></body></html>`;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json", "Idempotency-Key": `klin-signup-${data.user.id}-${crypto.randomUUID()}` },
      body: JSON.stringify({
        from,
        to: [email],
        reply_to: [replyTo],
        subject: "Verify your Klin email address",
        html,
        text: `Verify your Klin account by opening this link: ${confirmUrl.toString()}\n\nIf you did not create this account, ignore this email.`,
      }),
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    });
    if (!response.ok) {
      return NextResponse.json({ error: "Your account request was created, but Klin could not send the verification email. Contact Klin support before trying to create another account." }, { status: 502 });
    }
    return NextResponse.json({ sent: true, message: "Check your inbox for a verification link from Klin." }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Klin could not send your verification email. Try again or contact support." }, { status: 503 });
  }
}
