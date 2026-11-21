import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin, readLimitedJson } from "@/lib/request-security";
import { estimateBuild, type BuildProjectType } from "@/lib/project-estimator";
import { calculateAgentCapacity } from "@/lib/agent-capacity";

export const dynamic = "force-dynamic";

const PROJECT_TYPES = new Set(["website", "video_app", "mobile_app", "game", "business", "other"]);

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  const parsed = await readLimitedJson(request, 4096);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return NextResponse.json({ error: "Invalid estimate request." }, { status: 400 });
  }

  const input = parsed.value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !["project_type", "feature_count", "integrations_count", "asset_count", "checkpoint_interval_percent"].includes(key))) {
    return NextResponse.json({ error: "Unexpected estimate field." }, { status: 400 });
  }
  if (typeof input.project_type !== "string" || !PROJECT_TYPES.has(input.project_type)) {
    return NextResponse.json({ error: "Choose a supported project type." }, { status: 400 });
  }

  const checkpointInterval = input.checkpoint_interval_percent === undefined ? 10 : input.checkpoint_interval_percent;
  if (!Number.isInteger(checkpointInterval) || Number(checkpointInterval) < 5 || Number(checkpointInterval) > 20) {
    return NextResponse.json({ error: "Progress checkpoints must be set between 5% and 20%." }, { status: 400 });
  }

  const counts = [input.feature_count, input.integrations_count, input.asset_count];
  if (counts.some((value) => !Number.isInteger(value) || Number(value) < 0 || Number(value) > 100)) {
    return NextResponse.json({ error: "Feature, integration, and asset counts must be whole numbers from 0 to 100." }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const { data: subscriptions, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("plan_code,status")
      .eq("user_id", user.id)
      .eq("status", "active");
    if (subscriptionError) return NextResponse.json({ error: "Unable to verify your builder plan for quote pricing." }, { status: 503 });
    const entitlement = calculateAgentCapacity(subscriptions ?? []);
    const buildDiscountPercent = entitlement.active_builder_plan === "builder_pro"
      ? 10
      : entitlement.active_builder_plan === "builder_business"
        ? 20
        : 0;

    const estimate = estimateBuild({
      project_type: input.project_type as BuildProjectType,
      feature_count: Number(input.feature_count),
      integrations_count: Number(input.integrations_count),
      asset_count: Number(input.asset_count),
    });

    return NextResponse.json({
      estimate: {
        ...estimate,
        progress_checkpoint_percent: Number(checkpointInterval),
        active_builder_plan: entitlement.active_builder_plan,
        max_agents: entitlement.max_agents,
        build_discount_percent: buildDiscountPercent,
      },
      billing_notice: "Estimate only. Klin must disclose the $7–$35 price for each 10 active-hour block and obtain your approval before paid work starts. At each block boundary, Klin will notify you and allow 30 minutes to pay. If payment is not confirmed, the project pauses with its saved checkpoint. Idle and paused time are not billable.",
      execution_status: "builder_not_connected",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Build estimate service unavailable." }, { status: 503 });
  }
}
