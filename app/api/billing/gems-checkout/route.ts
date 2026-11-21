import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";
import { hasTrustedOrigin, readLimitedJson } from "@/lib/request-security";
import { getKlinAppOrigin } from "@/lib/app-url";

export const dynamic = "force-dynamic";

const GEM_PACKS: Record<string, { priceEnv: string; amountEnv: string }> = {
  gems_1000: { priceEnv: "STRIPE_PRICE_GEMS_1000", amountEnv: "KLIN_GEMS_AMOUNT_1000" },
  gems_5000: { priceEnv: "STRIPE_PRICE_GEMS_5000", amountEnv: "KLIN_GEMS_AMOUNT_5000" },
  gems_10000: { priceEnv: "STRIPE_PRICE_GEMS_10000", amountEnv: "KLIN_GEMS_AMOUNT_10000" },
};

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  try {
    const idempotencyKey = request.headers.get("idempotency-key");
    if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 128) return NextResponse.json({ error: "A valid Idempotency-Key header is required." }, { status: 400 });

    const parsed = await readLimitedJson(request, 4096);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    const body: unknown = parsed.value;
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    const packCode = (body as Record<string, unknown>).pack_code;
    if (typeof packCode !== "string" || !(packCode in GEM_PACKS)) return NextResponse.json({ error: "Choose a supported Gems pack." }, { status: 400 });

    const config = GEM_PACKS[packCode];
    const priceId = process.env[config.priceEnv];
    const amount = Number(process.env[config.amountEnv]);
    if (!priceId || !Number.isSafeInteger(amount) || amount <= 0) return NextResponse.json({ error: "This Gems pack is not configured yet." }, { status: 503 });

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    if (!user.email || !user.email_confirmed_at) return NextResponse.json({ error: "Verify your email address before purchasing Gems." }, { status: 403 });

    const stripe = getStripeClient();
    const origin = getKlinAppOrigin();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: { user_id: user.id, purchase_type: "gems", gems_amount: String(amount), pack_code: packCode },
      payment_intent_data: { metadata: { user_id: user.id, purchase_type: "gems", gems_amount: String(amount), pack_code: packCode } },
      success_url: `${origin}/wallet/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/wallet/cancel`,
    }, { idempotencyKey: `klin-gems-${user.id}-${idempotencyKey}` });

    if (!session.url) return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 502 });
    return NextResponse.json({ checkout_url: session.url, session_id: session.id, gems_amount: amount }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const unavailable = error instanceof Error && error.message.includes("not configured");
    return NextResponse.json({ error: unavailable ? "Gems payments are not configured on this deployment." : "Unable to create a secure Gems checkout." }, { status: unavailable ? 503 : 502 });
  }
}
