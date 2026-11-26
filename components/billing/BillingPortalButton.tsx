"use client";

import { useState } from "react";
import { CreditCard, ExternalLink } from "lucide-react";

export default function BillingPortalButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const openPortal = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        cache: "no-store",
      });
      const data = await response.json() as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || "Billing portal is unavailable.");
      window.location.assign(data.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Billing portal is unavailable.");
      setBusy(false);
    }
  };

  return (
    <section className="billing-portal-card">
      <div className="billing-portal-copy">
        <div className="billing-portal-icon"><CreditCard size={17} /></div>
        <div><h2>Manage subscription</h2><p>Update your payment method, view invoices, or cancel a subscription through Stripe&apos;s secure billing portal.</p></div>
      </div>
      <button type="button" onClick={() => void openPortal()} disabled={busy}>
        <span>{busy ? "Opening…" : "Open billing portal"}</span><ExternalLink size={14} />
      </button>
      {error && <p role="alert" className="billing-portal-error">{error}</p>}
    </section>
  );
}
