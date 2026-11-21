"use client";

import { useEffect, useState } from "react";
import { Bot, RefreshCw, ShieldAlert } from "lucide-react";

type Capacity = {
  free_agent_limit: number;
  active_paid_plan_count: number;
  agents_per_paid_plan: number;
  max_agents: number;
  agent_runtime: string;
  note: string;
};

export default function AgentCapacity() {
  const [capacity, setCapacity] = useState<Capacity | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/agents/limits", { credentials: "same-origin", cache: "no-store" });
      const data = await response.json() as Capacity & { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not load agent limits.");
      setCapacity(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load agent limits.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <main className="module-page">
      <header className="module-header">
        <div><div className="module-eyebrow">KLIN AUTOMATION</div><h1>Agent capacity</h1><p>See how many AI agents your account plan is allowed to use.</p></div>
        <button type="button" className="module-refresh" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> Refresh</button>
      </header>
      {error && <div className="module-alert module-alert-error" role="alert">{error}</div>}
      {loading && <section className="module-card"><p className="module-empty">Checking your plan…</p></section>}
      {capacity && (
        <>
          <section className="module-balance-card">
            <span>Maximum agents on this account</span>
            <strong>{capacity.max_agents} <small>AGENTS</small></strong>
            <p>{capacity.free_agent_limit} included on Free · {capacity.agents_per_paid_plan} additional per active paid plan</p>
          </section>
          <section className="module-card">
            <div className="module-card-title"><Bot size={17} /><h2>How your limit is calculated</h2></div>
            <p className="module-empty">{capacity.free_agent_limit} base agents + ({capacity.active_paid_plan_count} active paid plan(s) × {capacity.agents_per_paid_plan}) = {capacity.max_agents} maximum agents.</p>
          </section>
          <section className="module-card">
            <div className="module-card-title"><ShieldAlert size={17} /><h2>Agent runtime status</h2></div>
            <div className="module-alert module-alert-warning">The account limit is calculated from your subscription records, but Klin's multi-agent execution runtime is not connected yet. This screen does not launch agents or guarantee that this many can run simultaneously.</div>
            <p className="offline-privacy-note">{capacity.note}</p>
          </section>
        </>
      )}
    </main>
  );
}
