import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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
  if (Object.keys(input).some((key) => !["email", "password", "username"].includes(key))) {
    return NextResponse.json({ error: "Unexpected signup field." }, { status: 400 });
  }
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  const username = typeof input.username === "string" ? input.username.trim() : "";
  if (username.length <= 3 || username.length >= 50) {
    return NextResponse.json({ error: "Username must be more than 3 and fewer than 50 characters." }, { status: 400 });
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: "Password must be between 8 and 128 characters." }, { status: 400 });
  }
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return NextResponse.json({ error: "Klin email verification is not configured. Contact Klin support." }, { status: 503 });

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "signup",
      email,
      password,
    });
    const emailOtp = data.properties?.email_otp;
    if (error || !emailOtp || !data.user?.id) {
      return NextResponse.json({ error: "Unable to create your verification code. Check the address or try signing in if you already have an account." }, { status: 400 });
    }

    const from = process.env.KLIN_EMAIL_FROM || "Klin <no-reply@klin.website>";
    const replyTo = process.env.KLIN_SUPPORT_EMAIL || "support@klin.help";
    const safeEmail = escapeHtml(email);
    const safeOtp = escapeHtml(emailOtp);
    const html = '<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Your Klin verification code</title></head><body style="margin:0;background:#050505;color:#f5f5f5;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#050505;padding:32px 12px"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#101010;border:1px solid #333333;border-radius:16px"><tr><td style="padding:32px"><p style="font-size:13px;line-height:20px;color:#a3a3a3;margin:0 0 12px">KLIN ACCOUNT SECURITY</p><h1 style="font-size:26px;line-height:34px;color:#ffffff;margin:0 0 16px">Your verification code</h1><p style="font-size:15px;line-height:24px;color:#d4d4d4;margin:0 0 20px">Enter this code to verify ' + safeEmail + ' and finish creating your Klin account.</p><div style="padding:18px 20px;border:1px solid #555555;border-radius:12px;background:#080808;color:#ffffff;font-size:32px;line-height:40px;font-weight:bold;letter-spacing:10px;text-align:center">' + safeOtp + '</div><p style="font-size:12px;line-height:19px;color:#a3a3a3;margin:24px 0 0">This code is single-use and expires automatically. If you did not create this account, you can ignore this email.</p></td></tr></table></td></tr></table></body></html>';
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + resendKey,
        "Content-Type": "application/json",
        "Idempotency-Key": "klin-signup-" + data.user.id + "-" + crypto.randomUUID(),
      },
      body: JSON.stringify({
        from,
        to: [email],
        reply_to: [replyTo],
        subject: "Your Klin verification code",
        html,
        text: "Your Klin verification code is: " + emailOtp + "\n\nEnter this code in the Klin signup screen to verify your email. If you did not create this account, ignore this email.",
      }),
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    });
    if (!response.ok) return NextResponse.json({ error: "Your account request was created, but Klin could not send the verification code. Contact Klin support before trying to create another account." }, { status: 502 });
    return NextResponse.json({ sent: true, message: "Check your inbox for a six-digit verification code from Klin. Your username and account number will be available after verification." });
  } catch {
    return NextResponse.json({ error: "Klin could not send your verification code. Try again or contact support." }, { status: 503 });
  }
}
