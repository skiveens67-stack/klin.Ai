import assert from "node:assert/strict";
import { test } from "node:test";
import { estimateBuild } from "../lib/project-estimator.ts";

test("small website is automatically priced at $10 per ten-hour block", () => {
  const estimate = estimateBuild({ project_type: "website", feature_count: 0, integrations_count: 0, asset_count: 0 });
  assert.equal(estimate.complexity, "starter");
  assert.equal(estimate.ten_hour_block_price_usd, 10);
  assert.equal(estimate.billing_unit_hours, 10);
  assert.equal(estimate.estimated_blocks, Math.ceil(estimate.estimated_hours / 10));
  assert.equal(estimate.estimated_total_usd, estimate.estimated_blocks * 10);
});

test("complex video app is automatically priced at $35 per ten-hour block and capped at 25 days", () => {
  const estimate = estimateBuild({ project_type: "video_app", feature_count: 100, integrations_count: 50, asset_count: 100 });
  assert.equal(estimate.complexity, "heavy");
  assert.equal(estimate.ten_hour_block_price_usd, 35);
  assert.equal(estimate.estimated_days, 25);
  assert.equal(estimate.estimated_hours, 200);
  assert.equal(estimate.estimated_blocks, 20);
  assert.equal(estimate.estimated_total_usd, 700);
});

test("standard and advanced complexity rates are selected from project size", () => {
  const standard = estimateBuild({ project_type: "mobile_app", feature_count: 6, integrations_count: 1, asset_count: 2 });
  const advanced = estimateBuild({ project_type: "game", feature_count: 20, integrations_count: 5, asset_count: 10 });
  assert.equal(standard.ten_hour_block_price_usd, 15);
  assert.equal(advanced.ten_hour_block_price_usd, 25);
});

test("the estimate never exceeds 200 active hours or 25 eight-hour workdays", () => {
  const estimate = estimateBuild({ project_type: "game", feature_count: 1000, integrations_count: 1000, asset_count: 1000 });
  assert.equal(estimate.estimated_days, 25);
  assert.equal(estimate.estimated_hours, 200);
});
