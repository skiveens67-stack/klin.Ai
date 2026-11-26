import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin, readLimitedJson } from "@/lib/request-security";
import { estimateBuild, type BuildProjectType } from "@/lib/project-estimator";
import { calculateAgentCapacity } from "@/lib/agent-capacity";

export const dynamic = "force-dynamic";

const PROJECT_TYPE_MAP: Record<string, string> = {
  website: "website",
  video_app: "video",
  mobile_app: "app",
  game: "game",
  business: "other",
  other: "other",
};
const PLAN_MAX_HOURS: Record<string, number> = {
  free: 0.5,
  builder_starter: 24,
  builder_pro: 50,
  builder_business: 100,
};

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  const parsed = await readLimitedJson(request, 8192);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return NextResponse.json({ error: "Invalid quote request." }, { status: 400 });
  }

  const input = parsed.value as Record<string, unknown>;
  const allowed = ["title", "description", "project_type", "feature_count", "integrations_count", "asset_count"];
  if (Object.keys(input).some((key) => !allowed.includes(key))) {
    return NextResponse.json({ error: "Unexpected quote field." }, { status: 400 });
  }
  if (typeof input.title !== "string" || input.title.trim().length < 1 || input.title.trim().length > 120) {
    return NextResponse.json({ error: "Project name must be 1–120 characters." }, { status: 400 });
  }
  if (typeof input.description !== "string" || input.description.trim().length < 1 || input.description.trim().length > 5000) {
    return NextResponse.json({ error: "Project description must be 1–5,000 characters." }, { status: 400 });
  }
  if (typeof input.project_type !== "string" || !Object.hasOwn(PROJECT_TYPE_MAP, input.project_type)) {
    return NextResponse.json({ error: "Unsupported project type." }, { status: 400 });
  }
  const counts = [input.feature_count, input.integrations_count, input.asset_count];
  if (counts.some((value) => !Number.isInteger(value) || Number(value) < 0 || Number(value) > 100)) {
    return NextResponse.json({ error: "Feature, integration and asset counts must be whole numbers from 0 to 100." }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const { data: subscriptions, error: subscriptionError } = await supabase
      .from("subscriptions").select("plan_code,status").eq("user_id", user.id).eq("status", "active");
    if (subscriptionError) return NextResponse.json({ error: "Unable to verify your builder subscription." }, { status: 503 });

    const entitlement = calculateAgentCapacity(subscriptions ?? []);
    const activePlan = entitlement.active_builder_plan;
    const planMaxHours = PLAN_MAX_HOURS[activePlan] ?? PLAN_MAX_HOURS.free;
    const buildDiscountPercent = activePlan === "builder_pro" ? 10 : activePlan === "builder_business" ? 20 : 0;
    const estimate = estimateBuild({
      project_type: input.project_type as BuildProjectType,
      feature_count: Number(input.feature_count),
      integrations_count: Number(input.integrations_count),
      asset_count: Number(input.asset_count),
    });
    if (estimate.estimated_hours > planMaxHours) {
      return NextResponse.json({
        error: `This project is estimated at ${estimate.estimated_hours} active hours, above the ${activePlan.replace("builder_", "")} plan limit of ${planMaxHours} hours. Upgrade before locking this quote.`,
        required_hours: estimate.estimated_hours,
        plan_max_hours: planMaxHours,
      }, { status: 409 });
    }

    const blocks = estimate.estimated_blocks;
    const discount = 1 - buildDiscountPercent / 100;
    const low = Math.round(blocks * 7 * discount * 100) / 100;
    const high = Math.round(blocks * 35 * discount * 100) / 100;
    const isMultiDay = estimate.estimated_days > 1;
    const depositFor = (amount: number) => amount > 150 && isMultiDay ? Math.round(amount * 0.15 * 100) / 100 : Math.min(amount, 20);
    const depositLow = depositFor(low);
    const depositHigh = depositFor(high);

    const buildQuote = {
      quote_version: 1,
      status: "awaiting_deposit",
      currency: "USD",
      verified_builder_plan: activePlan,
      agent_limit: entitlement.max_agents,
      build_discount_percent: buildDiscountPercent,
      estimated_active_hours: estimate.estimated_hours,
      estimated_working_days: estimate.estimated_days,
      complexity: estimate.complexity,
      pricing_basis: "provisional_7_to_35_usd_per_10_active_hour_block",
      estimated_total_low_usd: low,
      estimated_total_high_usd: high,
      deposit_low_usd: depositLow,
      deposit_high_usd: depositHigh,
      deposit_rule: high > 150 && isMultiDay ? "15_percent_for_multi_day_over_150" : "20_usd_or_total_if_lower",
      deposit_credit_percent: 100,
      deposit_attempt: 0,
      remaining_balance_low_usd: Math.max(0, Math.round((low - depositLow) * 100) / 100),
      remaining_balance_high_usd: Math.max(0, Math.round((high - depositHigh) * 100) / 100),
      checkpoint_interval_percent: 10,
      created_at: new Date().toISOString(),
    };

    const { data: project, error: insertError } = await supabase.from("creator_projects").insert({
      owner_user_id: user.id,
      project_type: PROJECT_TYPE_MAP[input.project_type],
      title: input.title.trim(),
      description: input.description.trim(),
      status: "draft",
      visibility: "private",
      metadata: { builder_quote: buildQuote, requested_project_type: input.project_type },
    }).select("id,title,project_type,status,created_at,metadata").single();

    if (insertError || !project) return NextResponse.json({ error: "Unable to save the locked quote." }, { status: 500 });
    return NextResponse.json({
      project,
      quote: buildQuote,
      execution_status: "awaiting_deposit_builder_runtime_unavailable",
      note: "The quote is saved. No deposit has been collected and no agents have started.",
    }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Quote service unavailable." }, { status: 503 });
  }
}
