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
