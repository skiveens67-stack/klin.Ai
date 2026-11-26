export type BuildProjectType = "website" | "video_app" | "mobile_app" | "game" | "business" | "other";
export type BuildComplexity = "starter" | "standard" | "advanced" | "heavy";
export type BuildEstimateInput = { project_type: BuildProjectType; feature_count: number; integrations_count: number; asset_count: number };
export type BuildEstimate = { estimated_hours: number; estimated_days: number; max_days: 10; heavy_project_target_days: 7; complexity: BuildComplexity; ten_hour_block_price_usd: number; estimated_blocks: number; estimated_total_usd: number; billing_unit_hours: 10; billable_time_policy: "active_build_time_only" };
const BASE_HOURS: Record<BuildProjectType, number> = { website: 4, video_app: 12, mobile_app: 10, game: 14, business: 8, other: 6 };
const COMPLEXITY: Record<BuildComplexity, { multiplier: number; rate: number }> = {
  starter: { multiplier: 1, rate: 7 }, standard: { multiplier: 1.25, rate: 15 }, advanced: { multiplier: 1.6, rate: 25 }, heavy: { multiplier: 2, rate: 35 },
};
export function estimateBuild(input: BuildEstimateInput): BuildEstimate {
  const baselineHours = BASE_HOURS[input.project_type] + input.feature_count * 2.5 + input.integrations_count * 4 + input.asset_count * 1.25;
  const complexity: BuildComplexity = baselineHours < 20 ? "starter" : baselineHours < 50 ? "standard" : baselineHours < 100 ? "advanced" : "heavy";
  const tier = COMPLEXITY[complexity];
  const rawHours = baselineHours * tier.multiplier;
  const estimatedHours = Math.min(100, Math.max(1, Math.ceil(rawHours / 2) * 2));
  const estimatedBlocks = Math.ceil(estimatedHours / 10);
  const estimatedDays = Math.min(10, Math.max(1, Math.ceil(estimatedHours / 10)));
  return { estimated_hours: estimatedHours, estimated_days: estimatedDays, max_days: 10, heavy_project_target_days: 7, complexity, ten_hour_block_price_usd: tier.rate, estimated_blocks: estimatedBlocks, estimated_total_usd: estimatedBlocks * tier.rate, billing_unit_hours: 10, billable_time_policy: "active_build_time_only" };
}
