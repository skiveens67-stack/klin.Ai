import { NextResponse } from "next/server";
import { verifyResendWebhook } from "@/lib/resend-webhook-security";
import { processResendInboxEmail } from "@/lib/support-email";
import { readLimitedText } from "@/lib/request-security";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ResendWebhookEvent = { type?: string; data?: Record<string, unknown> };

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret || !process.env.RESEND_API_KEY) return NextResponse.json({ error: "Resend webhook is not configured." }, { status: 503 });
  const rawBody = await readLimitedText(request, 1024 * 1024);
  if (!rawBody.ok) return NextResponse.json({ error: rawBody.error }, { status: rawBody.status });
  let event: ResendWebhookEvent;
  try {
    if (!verifyResendWebhook(rawBody.value, request.headers, secret)) return NextResponse.json({ error: "Invalid Resend webhook signature." }, { status: 400 });
    event = JSON.parse(rawBody.value) as ResendWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid Resend webhook payload." }, { status: 400 });
  }
  if (event.type !== "inbox.email.received") return NextResponse.json({ received: true, ignored: true });
  if (!event.data || typeof event.data !== "object") return NextResponse.json({ error: "Invalid webhook event data." }, { status: 400 });
  try {
    const result = await processResendInboxEmail(event.data);
    return NextResponse.json({ received: true, result });
  } catch {
    return NextResponse.json({ error: "Unable to process inbound support email." }, { status: 503 });
  }
}
