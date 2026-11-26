"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, AtSign, CheckCircle2, CircleAlert, Copy, Globe2, Mail, RefreshCw, Search, Send } from "lucide-react";

type DomainResult = { domain: string; available: boolean; years: number; registrationPrice: number | null; renewalPrice: number | null; premium: boolean; currency: string };
type EmailDomain = { id: string; domain: string; status: string; dns_records: Array<{ record?: string; name?: string; type?: string; value?: string; priority?: number; ttl?: string }> };

export default function DomainEmailWorkspace() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DomainResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [sourceNote, setSourceNote] = useState("");
  const [domains, setDomains] = useState<EmailDomain[]>([]);
  const [domainInput, setDomainInput] = useState("");
  const [busyDomain, setBusyDomain] = useState(false);
  const [domainMessage, setDomainMessage] = useState("");
  const [domainError, setDomainError] = useState("");
  const [activeDomain, setActiveDomain] = useState<EmailDomain | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState("");

  const loadDomains = async () => {
    const response = await fetch("/api/email/domains", { credentials: "same-origin", cache: "no-store" });
    const data = await response.json();
    if (response.ok) setDomains(data.domains ?? []);
  };
  useEffect(() => { void loadDomains(); }, []);

  const search = async (event: React.FormEvent) => {
    event.preventDefault();
    setSearching(true); setSearchError(""); setResults([]);
    try {
      const response = await fetch("/api/domains/search", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: query }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Search failed.");
      setResults(data.results ?? []); setSourceNote(data.note ?? "");
    } catch (error) { setSearchError(error instanceof Error ? error.message : "Search failed."); }
    finally { setSearching(false); }
  };

  const connectDomain = async (event: React.FormEvent) => {
    event.preventDefault(); setBusyDomain(true); setDomainError(""); setDomainMessage(""); setActiveDomain(null);
    try {
      const response = await fetch("/api/email/domains", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domain: domainInput }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not connect domain.");
      setActiveDomain(data.domain); setDomainMessage(data.message); setDomainInput(""); await loadDomains();
    } catch (error) { setDomainError(error instanceof Error ? error.message : "Could not connect domain."); }
    finally { setBusyDomain(false); }
  };

  const verifyDomain = async (domain: EmailDomain) => {
    setBusyDomain(true); setDomainError(""); setDomainMessage("");
    try {
      const response = await fetch("/api/email/domains/verify", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: domain.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Verification failed.");
      setActiveDomain(data.domain); setDomainMessage(data.message); await loadDomains();
    } catch (error) { setDomainError(error instanceof Error ? error.message : "Verification failed."); }
    finally { setBusyDomain(false); }
  };

  const send = async (event: React.FormEvent) => {
    event.preventDefault(); setSending(true); setSendStatus("");
    try {
      const response = await fetch("/api/email/send", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from, to, subject, text: message }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Email could not be sent.");
      setSendStatus("Email accepted by the sending provider."); setSubject(""); setMessage("");
    } catch (error) { setSendStatus(error instanceof Error ? error.message : "Email could not be sent."); }
    finally { setSending(false); }
  };

  const money = (value: number | null, years: number) => value === null ? "—" : "$" + value.toFixed(2) + (years > 1 ? " / " + years + " yrs" : " / yr");

  return (
    <main className="klin-domain-page">
      <header className="klin-domain-header">
        <div className="klin-eyebrow"><span /> KLIN WORKSPACE TOOLS</div>
        <h1>Domains & email</h1>
        <p>Find a domain with a low upfront cost and affordable renewals. Connect a domain to send email from your own address.</p>
      </header>

      <section className="klin-domain-card">
        <div className="klin-domain-section-title"><Globe2 size={19} /><div><h2>Find an affordable domain</h2><p>Compare availability, first-year price, and renewal price.</p></div></div>
        <form className="klin-domain-search" onSubmit={search}>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Enter a name, e.g. mybusiness" maxLength={60} required />
          <button type="submit" disabled={searching}><Search size={16} /> {searching ? "Searching…" : "Find domains"}</button>
        </form>
        {searchError && <p className="klin-domain-error">{searchError}</p>}
        {results.length > 0 && <div className="klin-domain-results">
          <div className="klin-domain-result-head"><span>DOMAIN</span><span>FIRST TERM</span><span>RENEWAL</span><span>STATUS</span></div>
          {results.map((item) => <div className="klin-domain-result" key={item.domain}>
            <strong>{item.domain}</strong><span>{item.available ? money(item.registrationPrice, item.years) : "—"}</span><span>{item.available ? money(item.renewalPrice, 1) : "—"}</span>
            <span className={item.available ? "is-available" : "is-taken"}>{item.available ? item.premium ? "Premium" : "Available" : "Taken"}</span>
          </div>)}
          <p className="klin-domain-source">{sourceNote}</p>
        </div>}
      </section>

      <section className="klin-domain-card">
        <div className="klin-domain-section-title"><AtSign size={19} /><div><h2>Send email from your domain</h2><p>Connect a domain, add the DNS records, and verify it before sending.</p></div></div>
        <form className="klin-domain-search" onSubmit={connectDomain}>
          <input value={domainInput} onChange={(event) => setDomainInput(event.target.value)} placeholder="yourdomain.com" maxLength={253} required />
          <button type="submit" disabled={busyDomain}><Globe2 size={16} /> {busyDomain ? "Connecting…" : "Connect domain"}</button>
        </form>
        {domainError && <p className="klin-domain-error">{domainError}</p>}
        {domainMessage && <p className="klin-domain-status">{domainMessage}</p>}
        {activeDomain?.dns_records?.length ? <div className="klin-dns-list"><h3>DNS records to add at your registrar</h3>{activeDomain.dns_records.map((record, index) => <div className="klin-dns-record" key={index}><strong>{record.record || record.type || "DNS"}</strong><span>{record.name || "@"}</span><code>{record.value || "See provider details"}</code><button type="button" onClick={() => void navigator.clipboard.writeText(record.value || "")} aria-label="Copy DNS value"><Copy size={14} /></button></div>)}</div> : null}
        {domains.length > 0 && <div className="klin-connected-domains"><h3>Your connected domains</h3>{domains.map((domain) => <div className="klin-connected-domain" key={domain.id}>
          <span><strong>{domain.domain}</strong><small>{domain.status === "verified" ? "Ready to send" : "DNS verification required"}</small></span>
          <span className={domain.status === "verified" ? "is-available" : "is-taken"}>{domain.status}</span>
          {domain.status !== "verified" && <button type="button" disabled={busyDomain} onClick={() => void verifyDomain(domain)}><RefreshCw size={13} /> Verify</button>}
        </div>)}</div>}
      </section>

      <section className="klin-domain-card">
        <div className="klin-domain-section-title"><Mail size={19} /><div><h2>Compose an email</h2><p>Sending is enabled only for a domain you own and have verified.</p></div></div>
        <form className="klin-email-form" onSubmit={send}>
          <label>From address<input type="email" value={from} onChange={(event) => setFrom(event.target.value)} placeholder="hello@yourdomain.com" required /></label>
          <label>To<input type="email" value={to} onChange={(event) => setTo(event.target.value)} placeholder="recipient@example.com" required /></label>
          <label>Subject<input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={200} required /></label>
          <label>Message<textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={5} maxLength={20000} required /></label>
          {sendStatus && <p className="klin-domain-status">{sendStatus}</p>}
          <button type="submit" disabled={sending}><Send size={15} /> {sending ? "Sending…" : "Send email"}</button>
        </form>
        <p className="klin-domain-footnote"><CircleAlert size={14} /> Email delivery depends on successful DNS verification and the sending provider&apos;s policies.</p>
      </section>
    </main>
  );
}
