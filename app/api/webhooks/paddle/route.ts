import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { readLimitedText } from "@/lib/request-security";

export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function asIso(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function verifyPaddleSignature(rawBody: string, signatureHeader: string, secret: string): boolean {
  const parts = Object.fromEntries(
    signatureHeader.split(";").map((part) => {
      const separator = part.indexOf("=");
      return separator < 0 ? ["", ""] : [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
    }),
  );
  const timestamp = parts.ts;
  const suppliedHash = parts.h1;
  if (!timestamp || !suppliedHash || !/^\d+$/.test(timestamp)) return false;

  const timestampSeconds = Number(timestamp);
  if (!Number.isSafeInteger(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 5) return false;

  const expectedHash = createHmac("sha256", secret).update(`${timestamp}:${rawBody}`).digest("hex");
  const expected = Buffer.from(expectedHash, "hex");
  const supplied = Buffer.from(suppliedHash, "hex");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

export async function POST(request: Request) {
  const signature = request.headers.get("paddle-signature");
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Paddle webhook is not configured." }, { status: 503 });
  }

  const rawBodyResult = await readLimitedText(request, 1024 * 1024);
  if (!rawBodyResult.ok) {
    return NextResponse.json({ error: rawBodyResult.error }, { status: rawBodyResult.status });
  }
  const rawBody = rawBodyResult.value;
  if (!verifyPaddleSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid Paddle webhook signature." }, { status: 400 });
  }

  let event: JsonRecord;
  try {
    event = asRecord(JSON.parse(rawBody));
  } catch {
    return NextResponse.json({ error: "Invalid Paddle event payload." }, { status: 400 });
  }

  const eventId = typeof event.event_id === "string" ? event.event_id : null;
  const eventType = typeof event.event_type === "string" ? event.event_type : null;
  const data = asRecord(event.data);
  if (!eventId || !eventType || !Object.keys(data).length) {
    return NextResponse.json({ error: "Paddle event is missing required fields." }, { status: 400 });
  }

  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return NextResponse.json({ error: "Webhook database credentials are not configured." }, { status: 503 });
  }

  const { error: insertError } = await admin.from("payment_events").insert({
    provider_event_id: eventId,
    event_type: eventType,
    processing_status: "processing",
    payload: { object_id: data.id ?? null, data, occurred_at: event.occurred_at ?? null },
  });

  if (insertError?.code === "23505") {
    const { data: existing, error: lookupError } = await admin.from("payment_events")
      .select("processing_status").eq("provider_event_id", eventId).maybeSingle();
    if (lookupError || !existing) {
      return NextResponse.json({ error: "Unable to inspect existing Paddle event." }, { status: 500 });
    }
    if (existing.processing_status === "processed" || existing.processing_status === "ignored") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    const { error: retryError } = await admin.from("payment_events")
      .update({ processing_status: "processing", error_message: null })
      .eq("provider_event_id", eventId);
    if (retryError) return NextResponse.json({ error: "Unable to retry Paddle event." }, { status: 500 });
  } else if (insertError) {
    return NextResponse.json({ error: "Unable to record Paddle event." }, { status: 500 });
  }

  try {
    const subscriptionEvents = new Set([
      "subscription.created",
      "subscription.updated",
      "subscription.activated",
      "subscription.trialing",
      "subscription.past_due",
      "subscription.paused",
      "subscription.resumed",
      "subscription.canceled",
    ]);

    if (subscriptionEvents.has(eventType)) {
      const customData = asRecord(data.custom_data);
      const userId = typeof customData.klin_user_id === "string" ? customData.klin_user_id : null;
      const planCode = typeof customData.klin_plan_code === "string" ? customData.klin_plan_code : null;
      const subscriptionId = typeof data.id === "string" ? data.id : null;
      if (!userId || !planCode || !subscriptionId) {
        throw new Error("Paddle subscription is missing Klin account metadata.");
      }

      const items = Array.isArray(data.items) ? data.items : [];
      const firstItem = asRecord(items[0]);
      const price = asRecord(firstItem.price);
      const billingPeriod = asRecord(data.current_billing_period);
      const statusValue = typeof data.status === "string" ? data.status : "incomplete";
      const allowedStatuses = new Set([
        "trialing", "active", "past_due", "paused", "canceled",
        "incomplete", "unpaid",
      ]);
      const status = allowedStatuses.has(statusValue) ? statusValue : "incomplete";
      const scheduledChange = asRecord(data.scheduled_change);

      const { error: subscriptionError } = await admin.from("subscriptions").upsert({
        user_id: userId,
        provider: "paddle",
        provider_customer_id: typeof data.customer_id === "string" ? data.customer_id : null,
        provider_subscription_id: subscriptionId,
        provider_price_id: typeof price.id === "string" ? price.id : null,
        plan_code: planCode,
        status,
        current_period_start: asIso(billingPeriod.starts_at),
        current_period_end: asIso(billingPeriod.ends_at),
        cancel_at_period_end: scheduledChange.action === "cancel",
        canceled_at: asIso(data.canceled_at),
        metadata: { paddle_event_id: eventId, custom_data: customData },
      }, { onConflict: "provider_subscription_id" });
      if (subscriptionError) throw subscriptionError;
    }

    const finalStatus = subscriptionEvents.has(eventType) ? "processed" : "ignored";
    const { error: updateError } = await admin.from("payment_events")
      .update({ processing_status: finalStatus, processed_at: new Date().toISOString() })
      .eq("provider_event_id", eventId);
    if (updateError) throw updateError;

    return NextResponse.json({ received: true });
  } catch {
    await admin.from("payment_events")
      .update({ processing_status: "failed", error_message: "Paddle event processing failed." })
      .eq("provider_event_id", eventId);
    return NextResponse.json({ error: "Paddle event processing failed; Paddle may retry." }, { status: 500 });
  }
}
