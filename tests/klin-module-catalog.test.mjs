import assert from "node:assert/strict";
import { test } from "node:test";
import { KLIN_MODULE_LEVELS, KLIN_MODULE_ROLES } from "../lib/klin-module-catalog.ts";

test("Klin defines the six requested specialist modules", () => {
  assert.deepEqual(KLIN_MODULE_ROLES.map((role) => role.id), ["tester", "builder", "animator", "calculator", "helper", "safety"]);
});

test("Klin defines seven ordered intelligence levels", () => {
  assert.deepEqual(KLIN_MODULE_LEVELS.map((level) => level.id), ["v1", "v2", "v3", "v4", "v5", "v6", "v7"]);
  assert.deepEqual(KLIN_MODULE_LEVELS.map((level) => level.rank), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(KLIN_MODULE_LEVELS[0].name, "Klin V1 Free");
  assert.equal(KLIN_MODULE_LEVELS[5].name, "Klin V6 Ultra");
  assert.equal(KLIN_MODULE_LEVELS[6].name, "Klin V7 Ultra Safe");
});

test("every module has a defined purpose and operating instructions", () => {
  for (const role of KLIN_MODULE_ROLES) {
    assert.ok(role.purpose.length > 20);
    assert.ok(role.instructions.length > 20);
  }
});
