import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateAgentCapacity } from "../lib/agent-capacity.ts";
test("free accounts receive a maximum of 30 agents", () => { assert.equal(calculateAgentCapacity([]).max_agents, 30); });
test("each distinct active paid plan adds ten agents", () => {
  const result = calculateAgentCapacity([{ plan_code: "galaxy", status: "active" }, { plan_code: "studio_pro", status: "active" }]);
  assert.equal(result.max_agents, 50);
});
test("duplicate subscription rows do not multiply the same plan entitlement", () => {
  const result = calculateAgentCapacity([{ plan_code: "galaxy", status: "active" }, { plan_code: "galaxy", status: "active" }]);
  assert.equal(result.max_agents, 40);
});
test("canceled, trial, and unknown plans do not add paid agents", () => {
  const result = calculateAgentCapacity([{ plan_code: "ultimate", status: "canceled" }, { plan_code: "galaxy", status: "trialing" }, { plan_code: "unrecognized", status: "active" }]);
  assert.equal(result.max_agents, 30);
});
