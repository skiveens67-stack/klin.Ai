"use client";

import { useMemo, useState } from "react";
import { Bot, CheckCircle2, CircleDollarSign, Clock3, Code2, Film, Gauge, Layers3, ShieldCheck, Workflow } from "lucide-react";

type Estimate = {
  estimated_hours: number;
  estimated_days: number;
  max_days: number;
  complexity: "starter" | "standard" | "advanced" | "heavy";
  ten_hour_block_price_usd: number;
  estimated_blocks: number;
  estimated_total_usd: number;
  billing_unit_hours: number;
  active_builder_plan: string;
  max_agents: number;
  build_discount_percent: number;
};

const plans = [
  { name: "Free", code: "free", maxHours: 0.5, price: "$0/mo", agents: "4 agents", duration: "30 minutes", discount: "No build discount", roles: "Planner · Frontend · Backend · QA" },
  { name: "Starter", code: "builder_starter", maxHours: 24, price: "$29/mo", agents: "10 agents", duration: "Up to 24 hours", discount: "Standard build pricing", roles: "Core agents + specialist builders" },
  { name: "Pro", code: "builder_pro", maxHours: 120, price: "$79/mo", agents: "20 agents", duration: "Up to 5 days", discount: "10% build discount", roles: "Parallel frontend, backend, data, video and QA teams" },
  { name: "Business", code: "builder_business", maxHours: 240, price: "$199/mo", agents: "30+ agents", duration: "Up to 10 days", discount: "20% build discount", roles: "Expanded specialist teams and business-kit workflows" },
];

const deliverables = [
  "Websites and full-stack web applications",
  "Video applications and media workflows",
  "Software products and internal business tools",
  "Digital business kits: website, checkout, CRM/email flows, brand assets and launch checklist",
];

export default function AutonomousBuilder() {
  const [projectType, setProjectType] = useState("website");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [features, setFeatures] = useState(4);
  const [integrations, setIntegrations] = useState(1);
  const [assets, setAssets] = useState(0);
  const [plan, setPlan] = useState("Free");
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  const selectedPlan = plans.find((item) => item.name === plan) ?? plans[0];
  const verifiedPlan = estimate ? plans.find((item) => item.code === estimate.active_builder_plan) ?? plans[0] : plans[0];
  const quote = useMemo(() => {
    if (!estimate) return null;
    const discount = estimate.build_discount_percent / 100;
    const blocks = estimate.estimated_blocks;
    const low = Math.round(blocks * 7 * (1 - discount) * 100) / 100;
    const high = Math.round(blocks * 35 * (1 - discount) * 100) / 100;
    const isMultiDay = estimate.estimated_days > 1;
    const depositFor = (amount: number) => amount > 150 && isMultiDay ? Math.round(amount * 0.15 * 100) / 100 : Math.min(amount, 20);
    const depositLow = depositFor(low);
    const depositHigh = depositFor(high);
    return { low, high, depositLow, depositHigh, balanceLow: Math.max(0, Math.round((low - depositLow) * 100) / 100), balanceHigh: Math.max(0, Math.round((high - depositHigh) * 100) / 100), discount, isMultiDay };
  }, [estimate]);

  async function subscribeToSelectedPlan() {
    if (selectedPlan.code === "free") return;
    setCheckoutLoading(true);
    setCheckoutError("");
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ plan_code: selectedPlan.code }),
      });
      const data = await response.json() as { checkout_url?: string; error?: string };
      if (!response.ok || !data.checkout_url) throw new Error(data.error || "This plan is not available for checkout yet.");
      window.location.assign(data.checkout_url);
    } catch (caught) {
      setCheckoutError(caught instanceof Error ? caught.message : "Checkout could not be started.");
      setCheckoutLoading(false);
    }
  }

  async function createQuote() {
    setLoading(true);
    setError("");
    setEstimate(null);
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
          checkpoint_interval_percent: 10,
        }),
      });
      const data = await response.json() as { estimate?: Estimate; error?: string };
      if (!response.ok || !data.estimate) throw new Error(data.error || "Could not prepare this quote.");
      setEstimate(data.estimate);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not prepare this quote.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="module-page">
      <header className="module-header">
        <div>
          <div className="module-eyebrow">KLIN AUTONOMOUS STUDIO</div>
          <h1>Autonomous Builder</h1>
          <p>Plan, build, test and package complete digital products with coordinated specialist agents.</p>
        </div>
      </header>

      <section className="module-card">
        <div className="module-card-title"><Workflow size={18} /><h2>What Klin can build</h2></div>
        <div className="module-grid">
          {deliverables.map((item, index) => (
            <div className="module-list-item" key={item}>
              {index === 0 ? <Code2 size={17} /> : index === 1 ? <Film size={17} /> : index === 2 ? <Layers3 size={17} /> : <CircleDollarSign size={17} />}
              <span>{item}</span>
            </div>
          ))}
        </div>
        <p className="offline-privacy-note">Klin delivers digital infrastructure and setup instructions. It does not register legal entities, open bank accounts, or perform other offline legal or physical actions.</p>
      </section>

      <section className="module-card">
        <div className="module-card-title"><Bot size={18} /><h2>Build team and plan limits</h2></div>
        <p className="offline-drafts-copy">Choose the plan you intend to use. The server must verify your actual active subscription before it can authorize a build; selecting a plan here does not unlock capacity.</p>
        <div className="module-grid">
          {plans.map((item) => (
            <button type="button" key={item.name} onClick={() => { setPlan(item.name); setEstimate(null); }} className={`module-plan-card ${plan === item.name ? "module-plan-card-selected" : ""}`} aria-pressed={plan === item.name}>
              <strong>{item.name}</strong><b>{item.price}</b><span>{item.agents} · {item.duration}</span><small>{item.discount}</small><small>{item.roles}</small>
            </button>
          ))}
        </div>
        <button type="button" className="module-submit" disabled={checkoutLoading || selectedPlan.code === "free"} onClick={() => void subscribeToSelectedPlan()}>{checkoutLoading ? "Opening secure checkout…" : selectedPlan.code === "free" ? "Free plan selected" : `Subscribe to ${selectedPlan.name} · ${selectedPlan.price}`}</button>
        {checkoutError && <div className="module-alert module-alert-error" role="alert">{checkoutError}</div>}
        <div className="module-card-title"><ShieldCheck size={17} /><h3>Specialist roles</h3></div>
        <div className="module-grid">
          {["Planner — milestones and architecture", "Frontend — interface and responsive behavior", "Backend — APIs, data and integrations", "QA Tester — automated checks and failure reports"].map((role) => <div className="module-list-item" key={role}><CheckCircle2 size={16} /><span>{role}</span></div>)}
        </div>
        <p className="offline-privacy-note">Builder concurrency, agent isolation and plan enforcement are not live yet. This plan table is a product specification, not an active entitlement grant.</p>
      </section>

      <section className="module-card">
        <div className="module-card-title"><Gauge size={18} /><h2>Prepare a locked build quote</h2></div>
        <p className="offline-drafts-copy">Describe the work first. Klin estimates time and cost before any build starts. No agents are started and no payment is taken by this quote calculator.</p>
        <div className="module-form">
          <div className="module-field"><label htmlFor="builder-title">Project name</label><input id="builder-title" maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. My video platform" /></div>
          <div className="module-field"><label htmlFor="builder-type">Product type</label><select id="builder-type" value={projectType} onChange={(event) => { setProjectType(event.target.value); setEstimate(null); }}><option value="website">Website</option><option value="video_app">Video application</option><option value="mobile_app">Mobile app</option><option value="game">Game</option><option value="business">Digital business kit / platform</option><option value="other">Other software</option></select></div>
          <div className="module-field"><label htmlFor="builder-description">What should it do?</label><textarea id="builder-description" rows={5} maxLength={5000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the users, main features, pages, workflows, integrations and expected result." /></div>
          <div className="module-field"><label htmlFor="builder-features">Feature count</label><input id="builder-features" type="number" min={0} max={100} value={features} onChange={(event) => { setFeatures(Number(event.target.value)); setEstimate(null); }} /></div>
          <div className="module-field"><label htmlFor="builder-integrations">External integrations</label><input id="builder-integrations" type="number" min={0} max={100} value={integrations} onChange={(event) => { setIntegrations(Number(event.target.value)); setEstimate(null); }} /></div>
          <div className="module-field"><label htmlFor="builder-assets">Media/assets</label><input id="builder-assets" type="number" min={0} max={100} value={assets} onChange={(event) => { setAssets(Number(event.target.value)); setEstimate(null); }} /></div>
          <button type="button" className="module-submit" disabled={loading || !title.trim() || !description.trim() || [features, integrations, assets].some((value) => !Number.isInteger(value) || value < 0 || value > 100)} onClick={() => void createQuote()}>{loading ? "Preparing quote…" : "Calculate locked build quote"}</button>
        </div>
        {error && <div className="module-alert module-alert-error" role="alert">{error}</div>}
        {estimate && quote && (
          <div className="module-estimate-result">
            <div className="module-card-title"><Clock3 size={17} /><h3>Locked Build Quote · preview</h3></div>
            <div className="module-estimate-metric"><span>Project</span><strong>{title}</strong><small>Verified entitlement: {verifiedPlan.name} · {estimate.max_agents} agents · {estimate.complexity} complexity</small></div>
            <div className="module-estimate-metric"><span>Estimated build time</span><strong>{estimate.estimated_hours} active hours</strong><small>Approximately {estimate.estimated_days} working day(s), subject to plan duration limits</small></div>
            <div className="module-estimate-metric"><span>Estimated total</span><strong>${quote.low.toFixed(2)} – ${quote.high.toFixed(2)}</strong><small>Range at $7–$35 per 10-hour block. {quote.discount ? `${Math.round(quote.discount * 100)}% verified plan discount applied` : "No verified builder discount"}</small></div>
            <div className="module-estimate-metric"><span>Deposit before build</span><strong>${quote.depositLow.toFixed(2)} – ${quote.depositHigh.toFixed(2)}</strong><small>{quote.high > 150 && quote.isMultiDay ? "15% upfront for a multi-day build over $150" : "$20 deposit, credited in full toward the final balance"}</small></div>
            <div className="module-estimate-total"><span>Remaining balance after deposit</span><strong>${quote.balanceLow.toFixed(2)} – ${quote.balanceHigh.toFixed(2)}</strong></div>
            <div className="module-alert module-alert-warning">This is an estimate preview, not an accepted quote or payment request. The current estimator prices 10-hour work blocks at a complexity-based rate. Final compute-hour and agent-tier pricing still needs a verified pricing table. The build runtime and deposit checkout are not connected, so no build can start from this screen.</div>
            <p className="offline-privacy-note">Project request: {description}</p>
          </div>
        )}
      </section>

      <section className="module-card">
        <div className="module-card-title"><ShieldCheck size={18} /><h2>Build safety and delivery gates</h2></div>
        <ol className="module-ordered-list">
          <li>Planner creates milestones and assigns non-overlapping work areas.</li>
          <li>Builder agents work in isolated branches or workspaces; shared files require controlled integration.</li>
          <li>QA runs syntax, lint, type, unit, link, responsiveness, security and functional checks before a preview is marked ready.</li>
          <li>At the selected 5%–10% checkpoints, Klin saves a version, reports progress and waits for user review.</li>
          <li>At 100%, the reviewed product is packaged in a watermarked sandbox. Publishing and source export remain locked until payment clears.</li>
        </ol>
        <p className="offline-privacy-note">Automatic heartbeat monitoring, two-minute offline pause, durable cloud snapshots, real multi-agent execution, generated-project QA, watermark enforcement and pay-to-publish are planned but not operational. Do not treat this page as proof that these controls are running.</p>
      </section>
    </main>
  );
}
