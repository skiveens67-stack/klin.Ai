import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { readLimitedText } from "@/lib/request-security";

export const dynamic = "force-dynamic";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function unixToIso(value: unknown): string | null {
  return typeof value === "number" && Number.isFinite(value) ? new Date(value * 1000).toISOString() : null;
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 503 });
  }

  const rawBodyResult = await readLimitedText(request, 1024 * 1024);
  if (!rawBodyResult.ok) {
    return NextResponse.json({ error: rawBodyResult.error }, { status: rawBodyResult.status });
  }
  const rawBody = rawBodyResult.value;
  let event: Stripe.Event;
  try {
    event = getStripeClient().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe webhook signature." }, { status: 400 });
  }

  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return NextResponse.json({ error: "Webhook database credentials are not configured." }, { status: 503 });
  }

  const object = asRecord(event.data.object);
  const objectId = typeof object.id === "string" ? object.id : null;
  const metadata = asRecord(object.metadata);
  const payload = {
    object_id: objectId,
    customer: typeof object.customer === "string" ? object.customer : null,
    subscription: typeof object.subscription === "string" ? object.subscription : null,
    payment_intent: typeof object.payment_intent === "string" ? object.payment_intent : null,
    amount_total: typeof object.amount_total === "number" ? object.amount_total : null,
    currency: typeof object.currency === "string" ? object.currency : null,
    metadata,
    livemode: event.livemode,
    created: event.created,
  };

  const { error: insertError } = await admin.from("payment_events").insert({
    provider_event_id: event.id,
    event_type: event.type,
    processing_status: "processing",
    payload,
  });

  if (insertError?.code === "23505") {
    const { data: existingEvent, error: lookupError } = await admin.from("payment_events")
      .select("processing_status").eq("provider_event_id", event.id).maybeSingle();
    if (lookupError || !existingEvent) {
      return NextResponse.json({ error: "Unable to inspect existing payment event." }, { status: 500 });
    }
    if (existingEvent.processing_status === "processed" || existingEvent.processing_status === "ignored") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    const { error: retryError } = await admin.from("payment_events")
      .update({ processing_status: "processing", error_message: null })
      .eq("provider_event_id", event.id);
    if (retryError) return NextResponse.json({ error: "Unable to retry payment event." }, { status: 500 });
  } else if (insertError) {
    return NextResponse.json({ error: "Unable to record payment event." }, { status: 500 });
  }

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const mode = object.mode;
      const paymentStatus = object.payment_status;
      const purchaseType = metadata.purchase_type;
      const userId = typeof metadata.user_id === "string" ? metadata.user_id : null;
      const gemsAmount = Number(metadata.gems_amount);
      const sessionId = typeof object.id === "string" ? object.id : null;
      const paymentIntent = typeof object.payment_intent === "string" ? object.payment_intent : null;

      if (mode === "payment" && purchaseType === "gems" && paymentStatus === "paid") {
        if (!userId || !sessionId || !Number.isSafeInteger(gemsAmount) || gemsAmount <= 0) {
          throw new Error("Paid Gems checkout is missing validated purchase metadata.");
        }
        const { error: walletError } = await admin.rpc("post_wallet_transaction", {
          p_user_id: userId,
          p_delta_gems: gemsAmount,
          p_transaction_type: "purchase",
          p_idempotency_key: `stripe_checkout_${sessionId}`,
          p_description: "Gems purchase",
          p_provider_reference: paymentIntent,
          p_metadata: { stripe_event_id: event.id, pack_code: metadata.pack_code ?? null },
        });
        if (walletError) throw walletError;
      }

      if (mode === "payment" && purchaseType === "builder_deposit" && paymentStatus === "paid") {
        const projectId = typeof metadata.project_id === "string" ? metadata.project_id : null;
        const quoteVersion = Number(metadata.quote_version);
        const depositCents = Number(metadata.deposit_amount_cents);
        const paidCents = Number(object.amount_total);
        const currency = typeof object.currency === "string" ? object.currency.toLowerCase() : null;
        if (!userId || !sessionId || !projectId || !Number.isSafeInteger(quoteVersion) || !Number.isSafeInteger(depositCents) || depositCents < 1 || paidCents !== depositCents || currency !== "usd") {
          throw new Error("Builder deposit payment is missing validated quote metadata or amount.");
        }

        const { data: project, error: projectError } = await admin.from("creator_projects")
          .select("id,owner_user_id,metadata").eq("id", projectId).eq("owner_user_id", userId).maybeSingle();
        if (projectError || !project) throw new Error("Builder deposit project ownership could not be verified.");
        const projectMetadata = asRecord(project.metadata);
        const quote = asRecord(projectMetadata.builder_quote);
        if (quote.status === "deposit_paid" && quote.deposit_checkout_session_id === sessionId) {
          // Duplicate payment notification for the already-recorded deposit.
        } else {
          const expectedDepositCents = Math.round(Number(quote.deposit_high_usd) * 100);
          if (quote.status !== "awaiting_deposit" || quote.quote_version !== quoteVersion || expectedDepositCents !== depositCents) {
            throw new Error("Builder deposit does not match the current saved quote.");
          }
          const updatedQuote = {
            ...quote,
            status: "deposit_paid",
            deposit_paid_cents: depositCents,
            deposit_paid_usd: depositCents / 100,
            deposit_paid_at: new Date().toISOString(),
            deposit_checkout_session_id: sessionId,
            deposit_payment_intent_id: paymentIntent,
            deposit_credit_percent: 100,
          };
          const { error: quoteUpdateError } = await admin.from("creator_projects")
            .update({ metadata: { ...projectMetadata, builder_quote: updatedQuote, builder_execution_status: "deposit_paid_waiting_for_builder_runtime" } })
            .eq("id", projectId).eq("owner_user_id", userId);
          if (quoteUpdateError) throw quoteUpdateError;
        }
      }
    }

    if (event.type.startsWith("customer.subscription.")) {
      const subscription = object;
      const userId = typeof metadata.user_id === "string" ? metadata.user_id : null;
      const subscriptionId = typeof subscription.id === "string" ? subscription.id : null;
      if (userId && subscriptionId) {
        const items = asRecord(subscription.items);
        const itemData = Array.isArray(items.data) ? asRecord(items.data[0]) : {};
        const price = asRecord(itemData.price);
        const priceId = typeof price.id === "string" ? price.id : null;
        const status = typeof subscription.status === "string" ? subscription.status : "incomplete";
        const validStatuses = new Set(["incomplete","trialing","active","past_due","canceled","unpaid","paused","incomplete_expired"]);
        const { error: subscriptionError } = await admin.from("subscriptions").upsert({
          user_id: userId,
          provider: "stripe",
          provider_customer_id: typeof subscription.customer === "string" ? subscription.customer : null,
          provider_subscription_id: subscriptionId,
          provider_price_id: priceId,
          plan_code: typeof metadata.plan_code === "string" ? metadata.plan_code : (priceId ?? "unknown"),
          status: validStatuses.has(status) ? status : "incomplete",
          current_period_start: unixToIso(subscription.current_period_start),
          current_period_end: unixToIso(subscription.current_period_end),
          cancel_at_period_end: subscription.cancel_at_period_end === true,
          canceled_at: unixToIso(subscription.canceled_at),
          metadata,
        }, { onConflict: "provider_subscription_id" });
        if (subscriptionError) throw subscriptionError;
      }
    }

    const { error: updateError } = await admin.from("payment_events")
      .update({ processing_status: "processed", processed_at: new Date().toISOString() })
      .eq("provider_event_id", event.id);
    if (updateError) throw updateError;

    return NextResponse.json({ received: true });
  } catch {
    await admin.from("payment_events")
      .update({ processing_status: "failed", error_message: "Event processing failed." })
      .eq("provider_event_id", event.id);
    return NextResponse.json({ error: "Webhook processing failed; Stripe may retry." }, { status: 500 });
  }
}
