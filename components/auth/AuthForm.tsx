"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Sparkles } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Props = { mode: "login" | "signup"; initialError?: string };

export default function AuthForm({ mode, initialError }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(initialError === "configuration"
    ? "Klin sign-in is not configured in this deployment. Add the public Supabase URL and publishable key."
    : initialError === "callback"
      ? "Your sign-in link could not be verified. Request a new link or sign in again."
      : "");
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        router.replace("/");
        router.refresh();
      } else {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password }),
        });
        const data = await response.json() as { message?: string; error?: string };
        if (!response.ok) throw new Error(data.error || "Unable to create your account.");
        setMessage(data.message || "Check your email for a verification link from Klin.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <Link className="auth-brand" href="/" aria-label="Klin home">
          <span className="auth-brand-mark"><Sparkles size={19} /></span>
          <span>Klin<span className="auth-brand-dot">.</span></span>
        </Link>
        <div className="auth-kicker">YOUR AI WORKSPACE</div>
        <h1>{mode === "login" ? "Welcome back." : "Create your Klin account."}</h1>
        <p className="auth-intro">{mode === "login" ? "Sign in to continue to your conversations and workspace." : "Set up your account to access your personal AI workspace."}</p>

        <form onSubmit={submit} className="auth-form">
          <label htmlFor="email">Email address</label>
          <div className="auth-input-wrap"><Mail size={17} /><input id="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div>
          <label htmlFor="password">Password</label>
          <div className="auth-input-wrap"><LockKeyhole size={17} /><input id="password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /><button className="auth-show-password" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
          {error && <p className="auth-alert auth-error" role="alert">{error}</p>}
          {message && <p className="auth-alert auth-message" role="status">{message}</p>}
          <button className="auth-submit" type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"} <ArrowRight size={17} /></button>
        </form>

        <p className="auth-switch">{mode === "login" ? "New to Klin?" : "Already have an account?"} <Link href={mode === "login" ? "/signup" : "/login"}>{mode === "login" ? "Create an account" : "Sign in"}</Link></p>
        <p className="auth-footnote">Your account is protected by Klin&apos;s authenticated session and private conversation access controls.</p>
      </section>
      <aside className="auth-side">
        <div className="auth-orb auth-orb-one" /><div className="auth-orb auth-orb-two" />
        <div className="auth-side-content"><div className="auth-side-label"><span /> KLIN WORKSPACE</div><h2>One place for the work you do with AI.</h2><p>Conversations, projects, and creative tools — organized around your account.</p><div className="auth-side-grid"><span>PRIVATE BY DEFAULT</span><span>BUILT TO EXPAND</span><span>ONE WORKSPACE</span></div></div>
      </aside>
    </main>
  );
}
