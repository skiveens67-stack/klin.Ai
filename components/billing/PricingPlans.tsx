"use client";

import { useEffect, useState } from "react";
import { Check, CreditCard, ShieldCheck, Sparkles } from "lucide-react";

const memberships = [
  { name: "Starter", code: "free", price: "$0", detail: "Core Klin workspace and V7 Ultra Safe protection." },
  { name: "Plus", code: "plus", price: "$9.99/mo", detail: "More everyday Klin usage and creative tools." },
  { name: "Pro", code: "pro", price: "$24.99/mo", detail: "Higher usage for power users and creators." },
  { name: "Creator", code: "creator", price: "$19.99/mo", detail: "Creator tools and publishing workflows." },
  { name: "Galaxy", code: "galaxy", price: "$29.99/mo", detail: "Expanded creative and workspace access." },
  { name: "Studio Pro", code: "studio_pro", price: "$49.99/mo", detail: "Professional creation and project workflows." },
  { name: "Family Fortress", code: "family_fortress", price: "$34.99/mo", detail: "Family-focused features and guardian workflows." },
  { name: "Developer", code: "developer", price: "$79.99/mo", detail: "Developer-focused tools and integrations." },
  { name: "Merchant & Enterprise", code: "merchant_enterprise", price: "$79.99/mo", detail: "Merchant tools and business workflows." },
  { name: "Ultimate", code: "ultimate", price: "$149.99/mo", detail: "Highest standard membership tier." },
  { name: "Business", code: "business", price: "From $299/mo", detail: "Business workspaces and team operations." },
  { name: "Enterprise", code: "enterprise", price: "Custom", detail: "Custom deployment, security, and organization-wide support.", contactOnly: true },
] as const;

const builderPlans = [
  { name: "Free Builder", code: "free", price: "$0/mo", agents: "4 workers", duration: "30 minutes", discount: "No build discount" },
  { name: "Starter Builder", code: "builder_starter", price: "$29/mo", agents: "10 workers", duration: "24 hours", discount: "Standard build pricing" },
  { name: "Pro Builder", code: "builder_pro", price: "$79/mo", agents: "20 workers", duration: "5 days", discount: "10% build discount" },
  { name: "Business Builder", code: "builder_business", price: "$199/mo", agents: "30+ workers", duration: "10 days", discount: "20% build discount" },
] as const;

export default function PricingPlans() {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [enabledPlanCodes, setEnabledPlanCodes] = useState<string[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/billing/plans", { credentials: "same-origin", cache: "no-store" })
      .then(async response => {
        const data = await response.json() as { enabled_plan_codes?: string[] };
        if (active && response.ok) setEnabledPlanCodes(data.enabled_plan_codes ?? []);
      })
      .catch(() => { if (active) setEnabledPlanCodes([]); })
      .finally(() => { if (active) setLoadingPlans(false); });
    return () => { active = false; };
  }, []);

  async function checkout(code: string) {
    if (code === "free") return;
    setBusy(code);
    setError("");
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ plan_code: code }),
      });
      const data = await response.json() as { checkout_url?: string; error?: string };
      if (!response.ok || !data.checkout_url) throw new Error(data.error || "This plan is not configured for checkout yet.");
      window.location.assign(data.checkout_url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Checkout could not be started.");
      setBusy("");
    }
  }

  const planButton = (code: string, label: string) => {
    if (code === "free") return <span className="klin-plan-included">Included</span>;
    if (code === "enterprise") return <a className="klin-plan-button" href="https://klin.help" target="_blank" rel="noopener noreferrer">Contact support</a>;
    const enabled = enabledPlanCodes.includes(code);
    return <button className="klin-plan-button" type="button" disabled={busy !== "" || loadingPlans || !enabled} onClick={() => void checkout(code)}>
      {busy === code ? "Opening checkout…" : loadingPlans ? "Checking…" : enabled ? "Choose plan" : "Not available yet"}
    </button>;
  };

  return (
    <main className="klin-plans-page">
      <header className="klin-plans-header">
        <div><div className="klin-eyebrow"><span /> KLIN MEMBERSHIPS</div><h1>Plans & Pricing</h1><p>All plan options are listed here. Compare what each plan includes and see which checkouts are currently enabled.</p></div>
        <div className="klin-plans-header-mark"><CreditCard size={27} /></div>
      </header>
      {error && <div className="klin-plan-error" role="alert">{error}</div>}
      <section className="klin-plan-explainer"><ShieldCheck size={19} /><p><strong>Clear payment status.</strong> Prices are the current Klin plan proposal. A paid plan can only be purchased when its Stripe price and server-side checkout setting are enabled. Plans marked “Not available yet” will not charge you.</p></section>

      <section className="klin-plans-section">
        <div className="klin-plans-section-title"><div><span>01 / MEMBERSHIP</span><h2>Choose your Klin membership</h2><p>Monthly access for your main Klin workspace.</p></div><span className="klin-plans-count">12 options</span></div>
        <div className="klin-plans-grid">
          {memberships.map(plan => <article className={"klin-plan-card" + (plan.code === "pro" ? " is-featured" : "")} key={plan.code}>
            <div className="klin-plan-card-top"><strong>{plan.name}</strong>{plan.code === "pro" && <span className="klin-plan-recommended">POPULAR</span>}</div>
            <div className="klin-plan-price">{plan.price}</div><p>{plan.detail}</p>
            <div className="klin-plan-status">{plan.code === "free" ? "Available now" : plan.code === "enterprise" ? "Contact for details" : loadingPlans ? "Checking availability…" : enabledPlanCodes.includes(plan.code) ? "Checkout enabled" : "Early access / setup pending"}</div>
            {planButton(plan.code, plan.name)}
          </article>)}
        </div>
      </section>

      <section className="klin-plans-section">
        <div className="klin-plans-section-title"><div><span>02 / BUILD CAPACITY</span><h2>Autonomous Builder plans</h2><p>These plans control build-worker capacity and the maximum build window.</p></div><span className="klin-plans-count">4 options</span></div>
        <div className="klin-plans-grid klin-builder-plans-grid">
          {builderPlans.map(plan => <article className="klin-plan-card" key={plan.code}>
            <div className="klin-plan-card-top"><strong>{plan.name}</strong></div><div className="klin-plan-price">{plan.price}</div>
            <p>{plan.agents} · {plan.duration}</p><div className="klin-plan-status">{plan.discount}</div>
            {planButton(plan.code, plan.name)}
          </article>)}
        </div>
      </section>

      <section className="klin-plans-section klin-intelligence-plan">
        <div className="klin-plans-section-title"><div><span>03 / INTELLIGENCE</span><h2>Klin V6 Ultra Smart</h2><p>A separate intelligence add-on. Worker capacity remains controlled by your Builder plan.</p></div></div>
        <div className="klin-intelligence-card"><span className="klin-action-icon violet"><Sparkles size={20} /></span><div><strong>V6 Ultra Smart intelligence</strong><p>Its own subscription; it does not replace the free V7 Ultra Safe layer.</p></div>{planButton("klin_v6_ultra", "V6 Ultra Smart")}</div>
        <p className="klin-plan-footnote">Klin V7 Ultra Safe is free and always on. It is not a paid upgrade.</p>
      </section>

      <section className="klin-plans-section">
        <div className="klin-included-card"><div><Check size={18} /><strong>Included with every plan</strong></div><p>Klin V7 Ultra Safe · V7 Vault · core workspace · access to specialist modules within plan limits. Image and video creation remain marked Coming Soon.</p></div>
      </section>
      <footer className="klin-plans-footer">No payment is taken just by viewing this page. You only proceed to payment after selecting an enabled plan and confirming through checkout.</footer>
    </main>
  );
}
