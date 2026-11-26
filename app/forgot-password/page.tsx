"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function ForgotPasswordPage() {
  const [email,setEmail]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const supabase=createSupabaseBrowserClient();
      const redirectTo=new URL("/auth/callback?next=%2Freset-password",window.location.origin).toString();
      const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo});
      if(error) throw error;
      setMessage("If an account exists for that email, Klin has sent a password reset link. Check your inbox.");
    } catch(e) { setError(e instanceof Error?e.message:"Klin could not send a reset link. Try again."); }
    finally { setBusy(false); }
  }
  return <main className="auth-page auth-page-forgot"><section className="auth-panel">
    <Link className="auth-brand" href="/"><img src="/klin-logo.svg" alt="Klin" className="h-10 w-auto"/></Link>
    <div className="auth-kicker">ACCOUNT RECOVERY</div><h1>Reset your password.</h1>
    <p className="auth-intro">Enter the email address connected to your Klin account. We’ll send you a secure reset link.</p>
    <form onSubmit={submit} className="auth-form">
      <label htmlFor="reset-email">Email address</label><div className="auth-input-wrap"><input id="reset-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></div>
      {error&&<p className="auth-alert auth-error" role="alert">{error}</p>}
      {message&&<p className="auth-alert auth-message" role="status">{message}</p>}
      <button className="auth-submit" disabled={busy} type="submit">{busy?"Sending…":"Send reset link"}</button>
    </form><p className="auth-switch"><Link href="/login">Back to sign in</Link></p>
  </section><aside className="auth-side"><div className="auth-side-content"><div className="auth-side-label">KLIN ACCOUNT SECURITY</div><h2>Get back to your workspace.</h2><p>Use a secure email link to choose a new password.</p></div></aside></main>;
}
