"use client";

import { useState } from "react";
import { Calculator, Clock3, DollarSign } from "lucide-react";

type Estimate = {
  estimated_hours: number;
  estimated_days: number;
  max_days: number;
  heavy_project_target_days: number;
  progress_checkpoint_percent: number;
  complexity: "starter" | "standard" | "advanced" | "heavy";
  ten_hour_block_price_usd: number;
  estimated_blocks: number;
  estimated_total_usd: number;
  billing_unit_hours: number;
};

export default function BuildEstimator() {
  const [projectType, setProjectType] = useState("website");
  const [features, setFeatures] = useState(2);
  const [integrations, setIntegrations] = useState(0);
  const [assets, setAssets] = useState(0);
  const [checkpointInterval, setCheckpointInterval] = useState(10);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function calculate() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/projects/estimate", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_type: projectType,
          feature_count: features,
          integrations_count: integrations,
          asset_count: assets,
          checkpoint_interval_percent: checkpointInterval,
        }),
      });
      const data = await response.json() as { estimate?: Estimate; error?: string };
      if (!response.ok || !data.estimate) throw new Error(data.error || "Could not calculate the estimate.");
      setEstimate(data.estimate);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not calculate the estimate.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="module-card">
      <div className="module-card-title"><Calculator size={17} /><h2>Project time and cost estimate</h2></div>
      <p className="offline-drafts-copy">Klin estimates active build time from project type, features, integrations, and assets. Heavy projects target about 7 working days; the estimate is capped at 10 working days (100 active hours). For the full builder quote, verified plan limits, deposit and final-balance rules, use Autonomous Builder.</p>
      <div className="module-form">
        <div className="module-field"><label htmlFor="estimate-checkpoint">Progress report interval: {checkpointInterval}%</label><input id="estimate-checkpoint" type="range" min={5} max={20} step={5} value={checkpointInterval} onChange={(event) => setCheckpointInterval(Number(event.target.value))} /><small>Choose a report and review checkpoint every 5%, 10%, 15%, or 20% of verified progress.</small></div>
        <div className="module-field"><label htmlFor="estimate-type">Project type</label><select id="estimate-type" value={projectType} onChange={(event) => setProjectType(event.target.value)}><option value="website">Website</option><option value="video_app">Video app</option><option value="mobile_app">Mobile app</option><option value="game">Game</option><option value="business">Business platform</option><option value="other">Other</option></select></div>
        <div className="module-field"><label htmlFor="estimate-features">Features</label><input id="estimate-features" type="number" min={0} max={100} value={features} onChange={(event) => setFeatures(Number(event.target.value))} /></div>
        <div className="module-field"><label htmlFor="estimate-integrations">External integrations</label><input id="estimate-integrations" type="number" min={0} max={100} value={integrations} onChange={(event) => setIntegrations(Number(event.target.value))} /></div>
        <div className="module-field"><label htmlFor="estimate-assets">Media/assets</label><input id="estimate-assets" type="number" min={0} max={100} value={assets} onChange={(event) => setAssets(Number(event.target.value))} /></div>
        <button type="button" className="module-submit" disabled={loading || [features, integrations, assets].some((value) => !Number.isInteger(value) || value < 0 || value > 100)} onClick={() => void calculate()}>{loading ? "Calculating…" : "Calculate estimate"}</button>
      </div>
      {error && <div className="module-alert module-alert-error" role="alert">{error}</div>}
      {estimate && (
        <div className="module-estimate-result">
          <div className="module-estimate-metric"><Clock3 size={16} /><span>Estimated active build time</span><strong>{estimate.estimated_hours} hours</strong><small>About {estimate.estimated_days} working day(s) · heavy target {estimate.heavy_project_target_days} days · maximum {estimate.max_days} days</small></div>
          <div className="module-estimate-metric"><DollarSign size={16} /><span>Price per 10 active hours</span><strong>${estimate.ten_hour_block_price_usd}</strong><small>{estimate.complexity} complexity · {estimate.estimated_blocks} estimated blocks</small></div>
          <div className="module-estimate-total"><span>Estimated total if all blocks are used</span><strong>${estimate.estimated_total_usd.toLocaleString("en-US")}</strong></div>
          <p className="offline-privacy-note">This estimate uses a {estimate.progress_checkpoint_percent}% progress-report interval. The isolated builder and generated-project QA runtime are not connected yet.</p>
          <p className="offline-privacy-note">Estimate only. Before a build, Klin must show a locked quote and collect a $20 deposit, or 15% for a multi-day build estimated above $150. The deposit is credited in full toward the final invoice. The remaining balance is due before source export, watermark removal or publishing. Deposit collection and build execution are not connected yet.</p>
        </div>
      )}
    </section>
  );
}
