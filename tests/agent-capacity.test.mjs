import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateAgentCapacity } from "../lib/agent-capacity.ts";

test("free accounts receive four agents", () => {
  const result = calculateAgentCapacity([]);
  assert.equal(result.max_agents, 4);
  assert.equal(result.active_builder_plan, "free");
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
});

test("builder plans gate Klin intelligence levels", () => {
  assert.equal(calculateAgentCapacity([]).max_module_level, "v1");
  assert.equal(calculateAgentCapacity([{ plan_code: "builder_starter", status: "active" }]).max_module_level, "v3");
  assert.equal(calculateAgentCapacity([{ plan_code: "builder_pro", status: "active" }]).max_module_level, "v5");
  assert.equal(calculateAgentCapacity([{ plan_code: "builder_business", status: "active" }]).max_module_level, "v7");
});
