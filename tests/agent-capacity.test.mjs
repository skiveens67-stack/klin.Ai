import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateAgentCapacity } from "../lib/agent-capacity.ts";

test("free accounts receive four agents and always-on V7 safety", () => {
  const result = calculateAgentCapacity([]);
  assert.equal(result.max_agents, 4);
  assert.equal(result.active_builder_plan, "free");
  assert.equal(result.max_module_level, "v1");
  assert.equal(result.safety_layer, "v7_ultra_safe_always_on");
});

test("Starter, Pro and Business plans enforce their respective agent limits", () => {
  assert.equal(calculateAgentCapacity([{ plan_code: "builder_starter", status: "active" }]).max_agents, 10);
  assert.equal(calculateAgentCapacity([{ plan_code: "builder_pro", status: "active" }]).max_agents, 20);
  assert.equal(calculateAgentCapacity([{ plan_code: "builder_business", status: "active" }]).max_agents, 30);
});

test("the highest active builder tier wins and duplicate rows do not stack", () => {
  const result = calculateAgentCapacity([
    { plan_code: "builder_starter", status: "active" },
    { plan_code: "builder_pro", status: "active" },
    { plan_code: "builder_pro", status: "active" },
  ]);
  assert.equal(result.max_agents, 20);
  assert.equal(result.active_builder_plan, "builder_pro");
});

test("canceled, trial and legacy memberships do not grant builder agents", () => {
  const result = calculateAgentCapacity([
    { plan_code: "builder_business", status: "canceled" },
    { plan_code: "builder_pro", status: "trialing" },
    { plan_code: "ultimate", status: "active" },
  ]);
  assert.equal(result.max_agents, 4);
  assert.equal(result.max_module_level, "v1");
});

test("builder plans gate paid intelligence levels through V5", () => {
  assert.equal(calculateAgentCapacity([]).max_module_level, "v1");
  assert.equal(calculateAgentCapacity([{ plan_code: "builder_starter", status: "active" }]).max_module_level, "v3");
  assert.equal(calculateAgentCapacity([{ plan_code: "builder_pro", status: "active" }]).max_module_level, "v5");
  assert.equal(calculateAgentCapacity([{ plan_code: "builder_business", status: "active" }]).max_module_level, "v5");
});

test("V6 Ultra is a separate paid add-on and does not change worker count", () => {
  const standalone = calculateAgentCapacity([{ plan_code: "klin_v6_ultra", status: "active" }]);
  assert.equal(standalone.max_agents, 4);
  assert.equal(standalone.active_builder_plan, "free");
  assert.equal(standalone.max_module_level, "v6");
  assert.equal(standalone.v6_ultra_active, true);

  const combined = calculateAgentCapacity([
    { plan_code: "builder_starter", status: "active" },
    { plan_code: "klin_v6_ultra", status: "active" },
  ]);
  assert.equal(combined.max_agents, 10);
  assert.equal(combined.max_module_level, "v6");
});

test("inactive V6 Ultra subscriptions do not unlock V6", () => {
  const result = calculateAgentCapacity([{ plan_code: "klin_v6_ultra", status: "canceled" }]);
  assert.equal(result.max_module_level, "v1");
  assert.equal(result.v6_ultra_active, false);
});
