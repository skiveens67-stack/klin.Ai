"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type SupportCase = {
  id: string; sender: string; sender_address: string; subject: string; body_text: string;
  category: string; priority: string; summary: string | null; ai_draft: string | null;
  status: string; requires_human: boolean; escalation_reason: string | null;
  received_at: string; sent_at: string | null;
};

export default function KlinSupportPage() {
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [reply, setReply] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selected = useMemo(() => cases.find((item) => item.id === selectedId) ?? null, [cases, selectedId]);

  const loadCases = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const suffix = filter === "all" ? "" : "?status=" + encodeURIComponent(filter);
      const response = await fetch("/api/admin/support/emails" + suffix, { cache: "no-store" });
      const result = await response.json() as { cases?: SupportCase[]; error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to load support cases.");
      const nextCases = result.cases ?? [];
      setCases(nextCases);
      setSelectedId((current) => nextCases.some((item) => item.id === current) ? current : nextCases[0]?.id ?? "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load support cases.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { void loadCases(); }, [loadCases]);
  useEffect(() => { if (selected?.ai_draft && !reply) setReply(selected.ai_draft); }, [selected, reply]);

  async function sendReply() {
    if (!selected || !reply.trim() || sending) return;
    setSending(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/support/emails/" + selected.id + "/reply", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: reply.trim() }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Reply could not be sent.");
      setNotice("Reply sent.");
      setReply("");
      await loadCases();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Reply could not be sent.");
    } finally {
      setSending(false);
    }
  }

  return <main className="mx-auto w-full max-w-7xl space-y-5 p-5 text-white">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs uppercase tracking-[0.2em] text-emerald-400">Klin operations</p><h1 className="text-2xl font-semibold">Support inbox</h1><p className="text-sm text-slate-400">Review AI drafts before sending. High-risk cases require human handling.</p></div>
      <div className="flex gap-2"><select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm">
        <option value="all">All cases</option><option value="awaiting_review">Awaiting review</option><option value="needs_human">Needs human</option><option value="sent">Sent</option><option value="failed">Failed</option>
      </select><button onClick={() => void loadCases()} className="rounded-lg border border-white/15 px-3 py-2 text-sm">Refresh</button></div>
    </header>
    {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
    {notice && <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</p>}
    <div className="grid gap-4 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.5fr)]">
      <section className="space-y-2 rounded-xl border border-white/10 bg-slate-950 p-3">
        <h2 className="px-2 text-sm font-medium text-slate-300">Cases ({cases.length})</h2>
        {loading ? <p className="p-3 text-sm text-slate-500">Loading…</p> : cases.length === 0 ? <p className="p-3 text-sm text-slate-500">No support cases found.</p> : cases.map((item) =>
          <button key={item.id} onClick={() => { setSelectedId(item.id); setReply(item.ai_draft ?? ""); }} className={"w-full rounded-lg border p-3 text-left " + (item.id === selectedId ? "border-emerald-400/50 bg-emerald-400/10" : "border-white/5 hover:bg-white/5")}>
            <div className="flex justify-between gap-2"><span className="truncate text-sm font-medium">{item.subject}</span><span className="text-[10px] uppercase text-emerald-300">{item.priority}</span></div>
            <p className="mt-1 truncate text-xs text-slate-400">{item.sender} · {item.status}</p>
            <p className="mt-2 line-clamp-2 text-xs text-slate-500">{item.summary || item.body_text}</p>
          </button>
        )}
      </section>
      <section className="space-y-4 rounded-xl border border-white/10 bg-slate-950 p-4">
        {!selected ? <p className="text-sm text-slate-500">Select a case to review.</p> : <>
          <div><p className="text-xs text-slate-500">{selected.sender} · {selected.sender_address}</p><h2 className="mt-1 text-lg font-semibold">{selected.subject}</h2><p className="mt-1 text-xs text-slate-500">{new Date(selected.received_at).toLocaleString()} · {selected.category} · {selected.status}</p></div>
          {selected.requires_human && <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">Human review required: {selected.escalation_reason || "This case is marked for manual review."}</p>}
          {selected.summary && <div><h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Summary</h3><p className="whitespace-pre-wrap text-sm text-slate-300">{selected.summary}</p></div>}
          <div><h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Original email</h3><pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-3 text-sm text-slate-300">{selected.body_text}</pre></div>
          <div><label htmlFor="support-reply" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Reply draft</label><textarea id="support-reply" value={reply} onChange={(event) => setReply(event.target.value)} rows={8} maxLength={6000} className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white outline-none focus:border-emerald-400/50" /></div>
          <button disabled={sending || !reply.trim() || selected.status === "sent" || selected.requires_human} onClick={() => void sendReply()} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40">{sending ? "Sending…" : "Send reviewed reply"}</button>
          {selected.requires_human && <p className="text-xs text-slate-500">Automated sending is disabled for this case. Resolve the review outside this draft workflow.</p>}
        </>}
      </section>
    </div>
  </main>;
}
