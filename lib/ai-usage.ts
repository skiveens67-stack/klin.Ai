export type GatewayTokenUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

function safeUnits(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

export function createAiUsageEvent(input: {
  provider: string;
  model: string;
  feature: string;
  requestId?: string | null;
  usage?: GatewayTokenUsage;
}) {
  const usage = input.usage;
  return {
    provider: input.provider,
    model: input.model,
    feature: input.feature,
    input_units: safeUnits(usage?.prompt_tokens),
    output_units: safeUnits(usage?.completion_tokens),
    // The gateway response does not currently provide a verified USD cost.
    // Zero is a database placeholder only; metadata explicitly marks cost unknown.
    cost_microusd: 0,
    request_id: input.requestId ?? null,
    metadata: {
      usage_reported: Boolean(usage),
      total_tokens: safeUnits(usage?.total_tokens),
      cost_status: "not_reported",
    },
  };
}
