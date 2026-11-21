import assert from "node:assert/strict";
import { test } from "node:test";
import { KLIN_MODULE_LEVELS, KLIN_MODULE_ROLES } from "../lib/klin-module-catalog.ts";
import { KLIN_V7_SAFETY_POLICY } from "../lib/klin-v7-safety.ts";

test("Klin defines the six requested specialist modules", () => {
  assert.deepEqual(KLIN_MODULE_ROLES.map((role) => role.id), ["tester", "builder", "animator", "calculator", "helper", "safety"]);
});

test("paid intelligence levels run from V1 through V6; V7 is not a paid model level", () => {
  assert.deepEqual(KLIN_MODULE_LEVELS.map((level) => level.id), ["v1", "v2", "v3", "v4", "v5", "v6"]);
  assert.deepEqual(KLIN_MODULE_LEVELS.map((level) => level.rank), [1, 2, 3, 4, 5, 6]);
  assert.equal(KLIN_MODULE_LEVELS[0].name, "Klin V1 Free");
  assert.equal(KLIN_MODULE_LEVELS[5].name, "Klin V6 Ultra Smart");
});

test("V7 Ultra Safe is a free always-on policy, not an agent slot", () => {
  assert.match(KLIN_V7_SAFETY_POLICY, /FREE, ALWAYS ACTIVE/);
  assert.match(KLIN_V7_SAFETY_POLICY, /DIGNITY SHIELD/);
  assert.match(KLIN_V7_SAFETY_POLICY, /no public badge/);
  assert.match(KLIN_V7_SAFETY_POLICY, /21\+ COMPLIANCE FIREWALL/);
  assert.match(KLIN_V7_SAFETY_POLICY, /Never sell, rent, trade/);
  assert.match(KLIN_V7_SAFETY_POLICY, /does not consume a paid worker slot/);
});

test("every module has a defined purpose and operating instructions", () => {
  for (const role of KLIN_MODULE_ROLES) {
    assert.ok(role.purpose.length > 20);
    assert.ok(role.instructions.length > 20);
  }
});
