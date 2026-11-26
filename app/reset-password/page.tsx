"use client";

import { useState,type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function ResetPasswordPage() {
  const router=useRouter(); const [password,setPassword]=useState(""); const [confirm,setConfirm]=useState("");
  const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if(password!==confirm){setError("Your passwords do not match.");return;}
    setBusy(true);
    try { const supabase=createSupabaseBrowserClient(); const {error}=await supabase.auth.updateUser({password}); if(error) throw error; router.replace("/"); router.refresh(); }
    catch(e){setError(e instanceof Error?e.message:"Klin could not update your password. Request a new reset link.");}
    finally{setBusy(false);}
  }
  return <main className="auth-page auth-page-reset"><section className="auth-panel">
    <Link className="auth-brand" href="/"><img src="/klin-logo.svg" alt="Klin" className="h-10 w-auto"/></Link>
    <div className="auth-kicker">ACCOUNT RECOVERY</div><h1>Choose a new password.</h1>
    <p className="auth-intro">Create a new password for your Klin account.</p>
    <form onSubmit={submit} className="auth-form">
      <label htmlFor="new-password">New password</label><div className="auth-input-wrap"><input id="new-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters"/></div>
      <label htmlFor="confirm-password">Confirm new password</label><div className="auth-input-wrap"><input id="confirm-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Enter it again"/></div>
      {error&&<p className="auth-alert auth-error" role="alert">{error}</p>}
      <button className="auth-submit" disabled={busy} type="submit">{busy?"Updating…":"Update password"}</button>
    </form>
  </section><aside className="auth-side"><div className="auth-side-content"><div className="auth-side-label">KLIN ACCOUNT SECURITY</div><h2>A fresh start.</h2><p>Set a new password and return to your workspace.</p></div></aside></main>;
}
