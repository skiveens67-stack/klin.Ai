import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PRICE_ENV: Record<string, string> = {
  plus: "STRIPE_PRICE_PLUS",
  pro: "STRIPE_PRICE_PRO",
  family_fortress: "STRIPE_PRICE_FAMILY_FORTRESS",
  merchant_enterprise: "STRIPE_PRICE_MERCHANT_ENTERPRISE",
  creator: "STRIPE_PRICE_CREATOR",
  galaxy: "STRIPE_PRICE_GALAXY",
  studio_pro: "STRIPE_PRICE_STUDIO_PRO",
  developer: "STRIPE_PRICE_DEVELOPER",
  ultimate: "STRIPE_PRICE_ULTIMATE",
  business: "STRIPE_PRICE_BUSINESS",
  klin_v6_ultra: "STRIPE_PRICE_KLIN_V6_ULTRA",
  builder_starter: "STRIPE_PRICE_BUILDER_STARTER",
  builder_pro: "STRIPE_PRICE_BUILDER_PRO",
  builder_business: "STRIPE_PRICE_BUILDER_BUSINESS",
};

const V7_PLANS = new Set(["plus", "pro", "family_fortress", "merchant_enterprise"]);
const MEMBERSHIP_PLANS = new Set(["creator", "galaxy", "studio_pro", "developer", "ultimate", "business"]);
const BUILDER_PLANS = new Set(["builder_starter", "builder_pro", "builder_business"]);

function enabled(code: string) {
  if (!process.env[PRICE_ENV[code]]) return false;
  if (V7_PLANS.has(code)) return process.env.KLIN_V7_PLANS_ENABLED === "true";
  if (MEMBERSHIP_PLANS.has(code)) return process.env.KLIN_MEMBERSHIP_CHECKOUT_ENABLED === "true";
  if (BUILDER_PLANS.has(code)) return process.env.KLIN_BUILDER_RUNTIME_ENABLED === "true";
  if (code === "klin_v6_ultra") return process.env.KLIN_V6_ULTRA_CHECKOUT_ENABLED === "true" && Boolean(process.env.KLIN_MODULE_V6_MODEL);
  return false;
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const enabledPlanCodes = Object.keys(PRICE_ENV).filter(enabled);
    return NextResponse.json({
      enabled_plan_codes: enabledPlanCodes,
      builder_runtime_enabled: process.env.KLIN_BUILDER_RUNTIME_ENABLED === "true",
      v7_safety_layer: "always_on_free",
      v6_ultra_smart_enabled: enabledPlanCodes.includes("klin_v6_ultra"),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Plan availability is temporarily unavailable." }, { status: 503 });
  }
}
