import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { readLimitedText } from "@/lib/request-security";

export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

const PADDLE_GEM_PACKS: Record<string, { packCode: string; gems: number; amountCents: string }> = {
  "pri_01m8d58pxfn1gfkc1nr9drcpsw": { packCode: "starter", gems: 150, amountCents: "199" },
  "pri_01m8d59p5mh8ywtr4gzgdg0z7g": { packCode: "basic", gems: 450, amountCents: "499" },
  "pri_01m8d5b78g5kerj6djnmmgg854": { packCode: "popular", gems: 1000, amountCents: "999" },
  "pri_01m8d5c7b10z11w3wc19mj0x6c": { packCode: "pro", gems: 2400, amountCents: "1999" },
  "pri_01m8d5dw7742ngzb5mmt9n549k": { packCode: "ultimate", gems: 6000, amountCents: "4999" },
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function asIso(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function verifyPaddleSignature(rawBody: string, signatureHeader: string, secret: string): boolean {
  let timestamp = "";
  const suppliedHashes: string[] = [];
  for (const part of signatureHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key === "ts") timestamp = value;
    if (key === "h1" && /^[a-f0-9]{64}$/i.test(value)) suppliedHashes.push(value);
  }
  if (!timestamp || suppliedHashes.length === 0 || !/^\d+$/.test(timestamp)) return false;

  const timestampSeconds = Number(timestamp);
  // Paddle's documented SDK default is a five-second replay-protection window.
  if (!Number.isSafeInteger(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 5) return false;

  const expectedHash = createHmac("sha256", secret).update(`${timestamp}:${rawBody}`).digest();
  return suppliedHashes.some((hash) => {
    const supplied = Buffer.from(hash, "hex");
    return expectedHash.length === supplied.length && timingSafeEqual(expectedHash, supplied);
  });
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
    provider: "paddle",
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

    // Transaction notifications are retained for audit/reconciliation. Only a valid, signed
    // one-time Gem-pack transaction can credit Purchased Gems; subscription events stay separate.
    const transactionEvents = new Set([
      "transaction.created",
      "transaction.updated",
      "transaction.ready",
      "transaction.billed",
      "transaction.completed",
      "transaction.past_due",
      "transaction.payment_failed",
      "transaction.canceled",
    ]);
    let ignoreTransaction = false;
    if (eventType === "transaction.completed") {
      const customData = asRecord(data.custom_data);
      const userId = typeof customData.klin_user_id === "string" ? customData.klin_user_id : null;
      const packCode = typeof customData.klin_pack_code === "string" ? customData.klin_pack_code : null;
      const signatureValue = typeof customData.klin_signature === "string" ? customData.klin_signature : "";
      const transactionId = typeof data.id === "string" ? data.id : null;
      const items = Array.isArray(data.items) ? data.items : [];
      const firstItem = asRecord(items[0]);
      const price = asRecord(firstItem.price);
      const unitPrice = asRecord(price.unit_price);
      const details = asRecord(data.details);
      const totals = asRecord(details.totals);
      const priceId = typeof price.id === "string" ? price.id : null;
      const quantity = firstItem.quantity;
      const pack = priceId ? PADDLE_GEM_PACKS[priceId] : null;
      const signingSecret = process.env.PADDLE_WEBHOOK_SECRET;
      const expectedSignature = userId && packCode && signingSecret
        ? createHmac("sha256", signingSecret).update(`klin-gem-pack-v1:${userId}:${packCode}`).digest()
        : null;
      const suppliedSignature = /^[a-f0-9]{64}$/i.test(signatureValue)
        ? Buffer.from(signatureValue, "hex")
        : Buffer.alloc(0);

      const validGemPurchase = Boolean(
        userId &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId) &&
        transactionId &&
        /^txn_[a-z0-9]{26}$/i.test(transactionId) &&
        items.length === 1 &&
        quantity === 1 &&
        pack &&
        pack.packCode === packCode &&
        customData.klin_wallet_bucket === "purchased" &&
        data.status === "completed" &&
        data.origin === "api" &&
        data.currency_code === "USD" &&
        (totals.discount === "0" || totals.discount === 0) &&
        unitPrice.amount === pack.amountCents &&
        unitPrice.currency_code === "USD" &&
        expectedSignature &&
        suppliedSignature.length === expectedSignature.length &&
        timingSafeEqual(expectedSignature, suppliedSignature)
      );

      if (!validGemPurchase || !pack || !userId || !transactionId || !priceId) {
        // Other completed Paddle transactions (including subscriptions) are audit-only.
        ignoreTransaction = true;
      }
      if (validGemPurchase && pack && userId && transactionId && priceId) {
        const { error: walletError } = await admin.rpc("post_wallet_transaction", {
          p_user_id: userId,
          p_delta_gems: pack.gems,
          p_transaction_type: "purchase",
          p_idempotency_key: `paddle_transaction_${transactionId}`,
          p_description: `${pack.gems.toLocaleString("en-US")} Purchased Gems`,
          p_provider_reference: transactionId,
          p_metadata: {
            paddle_event_id: eventId,
            pack_code: pack.packCode,
            paddle_price_id: priceId,
            wallet_bucket: "purchased",
          },
        });
        if (walletError) throw walletError;
      }
    }

    const finalStatus = ignoreTransaction
      ? "ignored"
      : subscriptionEvents.has(eventType) || transactionEvents.has(eventType)
        ? "processed"
        : "ignored";
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
