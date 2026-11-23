import assert from "node:assert/strict";
import { test } from "node:test";
import { createAiUsageEvent } from "../lib/ai-usage.ts";

test("AI usage event records gateway token counts and marks cost as unknown", () => {
  assert.deepEqual(createAiUsageEvent({
    provider: "vercel-ai-gateway",
    model: "example/model",
    feature: "assistant:klinie",
    requestId: "req_123",
    usage: { prompt_tokens: 12, completion_tokens: 30, total_tokens: 42 },
  }), {
    provider: "vercel-ai-gateway",
    model: "example/model",
    feature: "assistant:klinie",
    input_units: 12,
    output_units: 30,
    cost_microusd: 0,
    request_id: "req_123",
    metadata: { usage_reported: true, total_tokens: 42, cost_status: "not_reported" },
  });
});

test("missing and invalid gateway usage never produces negative or unsafe counts", () => {
  const event = createAiUsageEvent({
    provider: "vercel-ai-gateway",
    model: "example/model",
    feature: "assistant:xzello",
    usage: { prompt_tokens: -1, completion_tokens: Number.MAX_SAFE_INTEGER + 1 },
  });
  assert.equal(event.input_units, 0);
  assert.equal(event.output_units, 0);
  assert.equal(event.metadata.usage_reported, true);
  assert.equal(event.metadata.cost_status, "not_reported");
});
