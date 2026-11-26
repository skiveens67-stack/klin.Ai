import "server-only";

import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resendInboxRequest } from "@/lib/resend-client";

type ChangeType = "email" | "password";

export function createSecurityCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashSecurityCode(userId: string, challengeId: string, code: string) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Security verification is not configured.");
  return createHmac("sha256", key).update(userId + "|" + challengeId + "|" + code).digest("hex");
}

export function safeCodeMatch(expected: string, supplied: string) {
  const left = Buffer.from(expected, "hex");
  const right = Buffer.from(supplied, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function recordSecurityEvent(
  userId: string,
  eventType: string,
  outcome: "allowed" | "blocked" | "pending" | "failed" | "alert",
  metadata: Record<string, string | number | boolean | null> = {},
) {
  const admin = createSupabaseAdminClient();
  await admin.from("klin_security_events").insert({
    user_id: userId,
    event_type: eventType,
    outcome,
    metadata,
  });
}

export async function sendSecurityChangeCode(input: {
  to: string;
  code: string;
  changeType: ChangeType;
  challengeId: string;
}) {
  const from = process.env.KLIN_EMAIL_FROM || "Klin <no-reply@klin.website>";
  const replyTo = process.env.KLIN_SUPPORT_EMAIL || "support@klin.help";
  const label = input.changeType === "email" ? "email address" : "password";
  const html = '<!doctype html><html><body style="margin:0;background:#050505;color:#f5f5f5;font-family:Arial,sans-serif;padding:32px"><main style="max-width:520px;margin:auto;background:#101010;border:1px solid #333;border-radius:16px;padding:28px"><p style="color:#a3a3a3;font-size:12px;letter-spacing:2px">KLIN ACCOUNT SECURITY</p><h1 style="font-size:24px">Verify this account change</h1><p style="color:#d4d4d4;line-height:1.6">A request was made to change the ' + label + ' on your Klin account. Nothing has been changed yet.</p><p style="font-size:34px;font-weight:bold;letter-spacing:10px;background:#080808;border:1px solid #555;border-radius:10px;padding:18px;text-align:center">' + input.code + '</p><p style="color:#a3a3a3;font-size:13px">This code expires in 10 minutes and can be used once. If you did not request this change, do not share the code and contact Klin Support.</p></main></body></html>';
  await resendInboxRequest<{ id: string }>("/emails", {
    method: "POST",
    headers: { "Idempotency-Key": "klin-security-change-" + input.challengeId },
    body: JSON.stringify({
      from,
      to: [input.to],
      reply_to: [replyTo],
      subject: "Klin security verification code",
      html,
      text: "A request was made to change the " + label + " on your Klin account. Nothing has been changed yet. Your one-time code is " + input.code + ". It expires in 10 minutes. If you did not request this, do not share the code and contact Klin Support.",
    }),
  });
}
