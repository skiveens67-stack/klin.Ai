import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";
import { getKlinAppOrigin } from "@/lib/app-url";
import { hasTrustedOrigin } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const { data: subscription, error } = await supabase.from("subscriptions")
      .select("provider_customer_id").eq("user_id", user.id)
      .not("provider_customer_id", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) return NextResponse.json({ error: "Unable to load billing account." }, { status: 500 });
    if (!subscription?.provider_customer_id) {
      return NextResponse.json({ error: "No Stripe billing account is linked to this user yet." }, { status: 404 });
    }

    const stripe = getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.provider_customer_id,
      return_url: `${getKlinAppOrigin()}/wallet`,
    });
    return NextResponse.json({ url: session.url }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Stripe Billing Portal is unavailable. Confirm that the customer portal is enabled in the Klin Stripe account." }, { status: 503 });
  }
}
