"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

export default function PublicSupportPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/support/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name, email, subject, message, website }),
      });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "Your message could not be sent.");
      setNotice(result.message || "Your message has been sent to Klin Support.");
      setName(""); setEmail(""); setSubject(""); setMessage(""); setWebsite("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your message could not be sent.");
    } finally { setBusy(false); }
  }

  return <main className="public-support-page">
    <header className="public-support-header">
      <Link href="/" className="public-support-brand"><img src="/klin-logo.svg" alt="Klin" /> <span>Klin</span></Link>
      <Link href="/login" className="public-support-login">Sign in</Link>
    </header>
    <section className="public-support-card">
      <p className="public-support-kicker">KLIN CUSTOMER SUPPORT</p>
      <h1>How can we help?</h1>
      <p className="public-support-intro">Send a message to the Klin support team. You do not need a Klin account or to sign in. We will reply to the email address you provide.</p>
      <form onSubmit={submit} className="public-support-form">
        <label htmlFor="support-name">Your name</label>
        <input id="support-name" required maxLength={100} autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
        <label htmlFor="support-email">Email address for our reply</label>
        <input id="support-email" type="email" required maxLength={254} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
        <label htmlFor="support-subject">Subject</label>
        <input id="support-subject" required minLength={3} maxLength={140} value={subject} onChange={e => setSubject(e.target.value)} placeholder="What do you need help with?" />
        <label htmlFor="support-message">Message</label>
        <textarea id="support-message" required minLength={10} maxLength={5000} rows={7} value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe what happened or what you need help with…" />
        <div className="support-honeypot" aria-hidden="true"><label htmlFor="support-website">Website</label><input id="support-website" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></div>
        {error && <p className="public-support-error" role="alert">{error}</p>}
        {notice && <p className="public-support-success" role="status">{notice}</p>}
        <button type="submit" disabled={busy}>{busy ? <><span className="support-button-spinner" /> Sending message…</> : "Send message"}</button>
      </form>
      <p className="public-support-footnote">Please do not include passwords, verification codes, or payment card details.</p>
    </section>
    <footer className="public-support-footer">Klin Support · <a href="mailto:support@klin.help">support@klin.help</a></footer>
  </main>;
}
