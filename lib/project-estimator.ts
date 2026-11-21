export type BuildProjectType = "website" | "video_app" | "mobile_app" | "game" | "business" | "other";
export type BuildComplexity = "starter" | "standard" | "advanced" | "heavy";

export type BuildEstimateInput = {
  project_type: BuildProjectType;
  complexity: BuildComplexity;
  feature_count: number;
  integrations_count: number;
  asset_count: number;
};

export type BuildEstimate = {
  estimated_hours: number;
  estimated_days: number;
  max_days: 25;
  two_hour_block_price_usd: number;
  estimated_blocks: number;
  estimated_total_usd: number;
  billing_unit_hours: 2;
  billable_time_policy: "active_build_time_only";
};

const BASE_HOURS: Record<BuildProjectType, number> = {
  website: 6,
  video_app: 14,
  mobile_app: 12,
  game: 16,
  business: 10,
  other: 8,
};

const COMPLEXITY: Record<BuildComplexity, { multiplier: number; rate: number }> = {
  starter: { multiplier: 1, rate: 10 },
  standard: { multiplier: 1.25, rate: 15 },
  advanced: { multiplier: 1.6, rate: 25 },
  heavy: { multiplier: 2, rate: 35 },
};

export function estimateBuild(input: BuildEstimateInput): BuildEstimate {
  const tier = COMPLEXITY[input.complexity];
  const rawHours = (BASE_HOURS[input.project_type]
    + input.feature_count * 2.5
    + input.integrations_count * 4
    + input.asset_count * 1.25) * tier.multiplier;
  const estimatedHours = Math.min(200, Math.max(2, Math.ceil(rawHours / 2) * 2));
  const estimatedBlocks = Math.ceil(estimatedHours / 2);
  const estimatedDays = Math.min(25, Math.max(1, Math.ceil(estimatedHours / 8)));
  return {
    estimated_hours: estimatedHours,
    estimated_days: estimatedDays,
    max_days: 25,
    two_hour_block_price_usd: tier.rate,
    estimated_blocks: estimatedBlocks,
    estimated_total_usd: estimatedBlocks * tier.rate,
    billing_unit_hours: 2,
    billable_time_policy: "active_build_time_only",
  };
}
