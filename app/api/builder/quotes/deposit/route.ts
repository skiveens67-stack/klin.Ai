import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";
import { getKlinAppOrigin } from "@/lib/app-url";
import { hasTrustedOrigin, readLimitedJson } from "@/lib/request-security";

export const dynamic = "force-dynamic";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  const idempotencyKey = request.headers.get("idempotency-key");
  if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 128 || !/^[a-zA-Z0-9._:-]+$/.test(idempotencyKey)) {
    return NextResponse.json({ error: "A valid Idempotency-Key header is required." }, { status: 400 });
  }

  const parsed = await readLimitedJson(request, 4096);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return NextResponse.json({ error: "Invalid deposit request." }, { status: 400 });
  }
  const input = parsed.value as Record<string, unknown>;
  if (Object.keys(input).some((key) => key !== "project_id") || typeof input.project_id !== "string" || !/^[0-9a-f-]{36}$/i.test(input.project_id)) {
    return NextResponse.json({ error: "A valid project ID is required." }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    if (!user.email || !user.email_confirmed_at) return NextResponse.json({ error: "Verify your email before paying a build deposit." }, { status: 403 });

    const { data: project, error: projectError } = await supabase.from("creator_projects")
      .select("id,title,owner_user_id,metadata")
      .eq("id", input.project_id).eq("owner_user_id", user.id).maybeSingle();
    if (projectError || !project) return NextResponse.json({ error: "Saved quote not found." }, { status: 404 });

    const metadata = asRecord(project.metadata);
    const quote = asRecord(metadata.builder_quote);
    if (quote.status === "deposit_paid") return NextResponse.json({ error: "This quote's deposit has already been paid." }, { status: 409 });
    if (quote.status !== "awaiting_deposit" || quote.currency !== "USD" || quote.quote_version !== 1) {
      return NextResponse.json({ error: "This quote is not eligible for a deposit payment." }, { status: 409 });
    }
    const depositUsd = Number(quote.deposit_high_usd);
    const depositCents = Math.round(depositUsd * 100);
    const totalHighCents = Math.round(Number(quote.estimated_total_high_usd) * 100);
    if (!Number.isSafeInteger(depositCents) || depositCents < 1 || !Number.isSafeInteger(totalHighCents) || depositCents > totalHighCents) {
      return NextResponse.json({ error: "The saved quote has an invalid deposit amount." }, { status: 409 });
    }

    const stripe = getStripeClient();
    const previousSessionId = typeof quote.deposit_checkout_session_id === "string" ? quote.deposit_checkout_session_id : null;
    if (previousSessionId) {
      try {
        const previous = await stripe.checkout.sessions.retrieve(previousSessionId);
        if (previous.status === "open" && previous.url) {
          return NextResponse.json({ checkout_url: previous.url, session_id: previous.id, deposit_amount_usd: depositUsd, reused: true }, { headers: { "Cache-Control": "no-store" } });
        }
        if (previous.status === "complete") {
          return NextResponse.json({ error: "Stripe has completed this checkout. Wait for the verified webhook to update the quote before retrying." }, { status: 409 });
        }
        if (previous.status === "expired") {
          return NextResponse.json({ error: "This deposit checkout expired. Create a fresh quote or contact Klin support before retrying." }, { status: 409 });
        }
      } catch {
        return NextResponse.json({ error: "Unable to verify the existing deposit checkout. Contact Klin support before retrying." }, { status: 503 });
      }
    }

    const origin = getKlinAppOrigin();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: depositCents,
          product_data: { name: `Klin build deposit — ${String(project.title).slice(0, 80)}`, description: "Credited in full toward the approved final build invoice." },
        },
      }],
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        purchase_type: "builder_deposit",
        project_id: project.id,
        quote_version: String(quote.quote_version),
        deposit_amount_cents: String(depositCents),
      },
      payment_intent_data: {
        metadata: {
          user_id: user.id,
          purchase_type: "builder_deposit",
          project_id: project.id,
          quote_version: String(quote.quote_version),
          deposit_amount_cents: String(depositCents),
        },
      },
      success_url: `${origin}/builder/deposit/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/builder/deposit/cancel?project_id=${encodeURIComponent(project.id)}`,
    }, { idempotencyKey: `klin-builder-deposit-${user.id}-${project.id}-v${quote.quote_version}` });

    if (!session.url) return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 502 });
    const nextQuote = { ...quote, deposit_checkout_session_id: session.id, deposit_checkout_created_at: new Date().toISOString() };
    const { error: updateError } = await supabase.from("creator_projects")
      .update({ metadata: { ...metadata, builder_quote: nextQuote } })
      .eq("id", project.id).eq("owner_user_id", user.id);
    if (updateError) return NextResponse.json({ error: "Checkout was created but the quote record could not be updated. Retry with the same request key or contact support." }, { status: 503 });

    return NextResponse.json({
      checkout_url: session.url,
      session_id: session.id,
      deposit_amount_usd: depositUsd,
      deposit_credit_percent: 100,
      note: "Payment is not confirmed until Klin receives and verifies Stripe's webhook. No build agents start from the checkout redirect.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to create a secure build-deposit checkout." }, { status: 503 });
  }
}
