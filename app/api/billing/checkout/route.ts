import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";
import { hasTrustedOrigin, readLimitedJson } from "@/lib/request-security";
import { getKlinAppOrigin } from "@/lib/app-url";

export const dynamic = "force-dynamic";

const PLAN_PRICE_ENV: Record<string, string> = {
  galaxy: "STRIPE_PRICE_GALAXY",
  studio_pro: "STRIPE_PRICE_STUDIO_PRO",
  ultimate: "STRIPE_PRICE_ULTIMATE",

  plus: "STRIPE_PRICE_PLUS",
  pro: "STRIPE_PRICE_PRO",
  family_fortress: "STRIPE_PRICE_FAMILY_FORTRESS",
  merchant_enterprise: "STRIPE_PRICE_MERCHANT_ENTERPRISE",
  creator: "STRIPE_PRICE_CREATOR",
  developer: "STRIPE_PRICE_DEVELOPER",
  business: "STRIPE_PRICE_BUSINESS",
  klin_v6_ultra: "STRIPE_PRICE_KLIN_V6_ULTRA",
  builder_starter: "STRIPE_PRICE_BUILDER_STARTER",
  builder_pro: "STRIPE_PRICE_BUILDER_PRO",
  builder_business: "STRIPE_PRICE_BUILDER_BUSINESS",
};

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });

  try {
    const idempotencyKey = request.headers.get("idempotency-key");
    if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 128) {
      return NextResponse.json({ error: "A valid Idempotency-Key header is required." }, { status: 400 });
    }

    const parsed = await readLimitedJson(request, 4096);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    const body: unknown = parsed.value;
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    const input = body as Record<string, unknown>;
    if (Object.keys(input).some((key) => key !== "plan_code")) {
      return NextResponse.json({ error: "Unexpected request field." }, { status: 400 });
    }
    const planCode = input.plan_code;
    if (typeof planCode !== "string" || !Object.hasOwn(PLAN_PRICE_ENV, planCode)) {
      return NextResponse.json({ error: "Choose a supported paid plan." }, { status: 400 });
    }

    const v7Plans = new Set(["plus", "pro", "family_fortress", "merchant_enterprise"]);
    const legacyMemberships = new Set(["creator", "galaxy", "studio_pro", "developer", "ultimate", "business"]);
    const builderPlans = new Set(["builder_starter", "builder_pro", "builder_business"]);
    if (v7Plans.has(planCode) && process.env.KLIN_V7_PLANS_ENABLED !== "true") {
      return NextResponse.json({ error: "V7 paid plan checkout is not open until plan entitlements, quotas and Stripe prices are approved." }, { status: 503 });
    }
    if (legacyMemberships.has(planCode) && process.env.KLIN_MEMBERSHIP_CHECKOUT_ENABLED !== "true") {
      return NextResponse.json({ error: "Paid membership checkout is not open on this early-access deployment yet." }, { status: 503 });
    }
    if (builderPlans.has(planCode) && process.env.KLIN_BUILDER_RUNTIME_ENABLED !== "true") {
      return NextResponse.json({ error: "Builder subscriptions are not open until the autonomous build runtime is ready." }, { status: 503 });
    }
    if (planCode === "klin_v6_ultra" && process.env.KLIN_V6_ULTRA_CHECKOUT_ENABLED !== "true") {
      return NextResponse.json({ error: "V6 Ultra Smart checkout is not open until its model, price and entitlement are verified." }, { status: 503 });
    }

    const priceId = process.env[PLAN_PRICE_ENV[planCode]];
    if (!priceId) return NextResponse.json({ error: "This plan is not configured for checkout yet." }, { status: 503 });

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    if (!user.email || !user.email_confirmed_at) return NextResponse.json({ error: "Verify your email address before starting a subscription." }, { status: 403 });

    const stripe = getStripeClient();
    const origin = getKlinAppOrigin();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: { user_id: user.id, plan_code: planCode },
      subscription_data: { metadata: { user_id: user.id, plan_code: planCode } },
      success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing/cancel`,
    }, { idempotencyKey: `klin-checkout-${user.id}-${idempotencyKey}` });

    if (!session.url) return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 502 });
    return NextResponse.json({ checkout_url: session.url, session_id: session.id }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error && error.message.includes("not configured")
      ? "Billing is not configured on this deployment."
      : "Unable to create a secure checkout session.";
    const status = message.includes("not configured") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
