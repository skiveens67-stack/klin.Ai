"use client";

import { useState } from "react";
import { Check, CreditCard, ShieldCheck, Sparkles } from "lucide-react";

const memberships = [
  { name: "Free", code: "free", price: "$0", detail: "Core Klin access and always-on V7 safety." },
  { name: "Starter", code: "starter", price: "$4.99/mo", detail: "More everyday Klin usage." },
  { name: "Plus", code: "plus", price: "$9.99/mo", detail: "Higher usage for regular users." },
  { name: "Creator", code: "creator", price: "$19.99/mo", detail: "Creator tools and publishing workflows." },
  { name: "Galaxy", code: "galaxy", price: "$29.99/mo", detail: "Expanded creative and workspace access." },
  { name: "Studio Pro", code: "studio_pro", price: "$49.99/mo", detail: "Professional creation and project workflows." },
  { name: "Developer", code: "developer", price: "$79.99/mo", detail: "Developer-focused tools and integrations." },
  { name: "Ultimate", code: "ultimate", price: "$149.99/mo", detail: "Highest standard membership tier." },
  { name: "Business", code: "business", price: "From $299/mo", detail: "Business workspaces and team operations." },
] as const;

const builderPlans = [
  { name: "Free Builder", code: "free", price: "$0/mo", agents: "4 workers", duration: "30 minutes", discount: "0% build discount" },
  { name: "Starter Builder", code: "builder_starter", price: "$29/mo", agents: "10 workers", duration: "24 hours", discount: "Standard build pricing" },
  { name: "Pro Builder", code: "builder_pro", price: "$79/mo", agents: "20 workers", duration: "5 days", discount: "10% build discount" },
  { name: "Business Builder", code: "builder_business", price: "$199/mo", agents: "30+ workers", duration: "10 days", discount: "20% build discount" },
] as const;

export default function PricingPlans() {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function checkout(code: string) {
    if (code === "free") return;
    setBusy(code);
    setError("");
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        credentials: "same-origin",
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

  return (
    <main className="module-page">
      <header className="module-header"><div><div className="module-eyebrow">KLIN EARLY ACCESS</div><h1>Plans &amp; Pricing</h1><p>Memberships, builder capacity and premium intelligence are separate entitlements.</p></div></header>
      {error && <div className="module-alert module-alert-error" role="alert">{error}</div>}
      <section className="module-card">
        <div className="module-card-title"><Sparkles size={18} /><h2>Klin memberships</h2></div>
        <div className="module-grid">
          {memberships.map((plan) => <article className="module-plan-card" key={plan.code}>
            <strong>{plan.name}</strong><b>{plan.price}</b><span>{plan.detail}</span>
            <button type="button" className="module-submit" disabled={busy !== "" || plan.code === "free"} onClick={() => void checkout(plan.code)}>{busy === plan.code ? "Opening checkout…" : plan.code === "free" ? "Included" : "Choose plan"}</button>
          </article>)}
        </div>
        <p className="offline-privacy-note">Published prices are the current proposed catalogue. A paid plan can be purchased only after its matching Stripe Price ID is configured on Klin&apos;s Stripe account.</p>
      </section>
      <section className="module-card">
        <div className="module-card-title"><CreditCard size={18} /><h2>Autonomous Builder plans</h2></div>
        <div className="module-grid">
          {builderPlans.map((plan) => <article className="module-plan-card" key={plan.code}>
            <strong>{plan.name}</strong><b>{plan.price}</b><span>{plan.agents} · {plan.duration}</span><small>{plan.discount}</small>
            <button type="button" className="module-submit" disabled={busy !== "" || plan.code === "free"} onClick={() => void checkout(plan.code)}>{busy === plan.code ? "Opening checkout…" : plan.code === "free" ? "Included" : "Choose plan"}</button>
          </article>)}
        </div>
      </section>
      <section className="module-card">
        <div className="module-card-title"><ShieldCheck size={18} /><h2>Klin V6 Ultra intelligence</h2></div>
        <p className="offline-drafts-copy">V6 Ultra is its own paid intelligence plan. It unlocks the V6 model level while keeping worker count governed by the user&apos;s Builder plan.</p>
        <button type="button" className="module-submit" disabled={busy !== ""} onClick={() => void checkout("klin_v6_ultra")}>{busy === "klin_v6_ultra" ? "Opening checkout…" : "Subscribe to V6 Ultra"}</button>
        <p className="offline-privacy-note">V6 Ultra pricing and its Stripe Price ID must be configured before checkout can complete. Klin V7 Ultra Safe is free and automatically active for every account; it is never an upgrade.</p>
      </section>
      <section className="module-card">
        <div className="module-card-title"><Check size={18} /><h2>Included with every plan</h2></div>
        <div className="module-grid">
          {["Klin V7 Ultra Safe · always-on safety layer", "Privacy-first defaults and Dignity Shield checks", "Access to the six specialist Klin Modules within plan limits", "Video creation remains marked Coming soon"].map((item) => <div className="module-list-item" key={item}><Check size={16} /><span>{item}</span></div>)}
        </div>
      </section>
    </main>
  );
}
