import assert from "node:assert/strict";
import { test } from "node:test";
import { estimateBuild } from "../lib/project-estimator.ts";

test("starter project estimates use the $10 two-hour rate", () => {
  const estimate = estimateBuild({ project_type: "website", complexity: "starter", feature_count: 0, integrations_count: 0, asset_count: 0 });
  assert.equal(estimate.two_hour_block_price_usd, 10);
  assert.equal(estimate.estimated_hours % 2, 0);
  assert.equal(estimate.estimated_total_usd, estimate.estimated_blocks * 10);
});

test("heavy projects use the $35 two-hour rate and are capped at 25 days", () => {
  const estimate = estimateBuild({ project_type: "video_app", complexity: "heavy", feature_count: 100, integrations_count: 50, asset_count: 100 });
  assert.equal(estimate.two_hour_block_price_usd, 35);
  assert.equal(estimate.estimated_days, 25);
  assert.equal(estimate.estimated_hours, 200);
  assert.equal(estimate.estimated_total_usd, 3500);
});

test("advanced mobile projects charge in two-hour increments", () => {
  const estimate = estimateBuild({ project_type: "mobile_app", complexity: "advanced", feature_count: 8, integrations_count: 2, asset_count: 4 });
  assert.equal(estimate.two_hour_block_price_usd, 25);
  assert.equal(estimate.estimated_blocks, estimate.estimated_hours / 2);
  assert.equal(estimate.estimated_total_usd, estimate.estimated_blocks * 25);
});

test("the estimate never exceeds 25 calendar workdays", () => {
  const estimate = estimateBuild({ project_type: "game", complexity: "heavy", feature_count: 1000, integrations_count: 1000, asset_count: 1000 });
  assert.equal(estimate.estimated_days, 25);
  assert.equal(estimate.estimated_hours, 200);
});
