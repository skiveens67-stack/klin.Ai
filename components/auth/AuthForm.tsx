"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import KlinLoading from "@/components/brand/KlinLoading";

type Props = { mode: "login" | "signup"; initialError?: string };

export default function AuthForm({ mode, initialError }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationPending, setVerificationPending] = useState(false);

  useEffect(() => {
    if (mode !== "signup") return;
    try {
      const savedEmail = window.localStorage.getItem("klin.pendingSignupEmail");
      if (savedEmail) {
        setEmail(savedEmail);
        setUsername(window.localStorage.getItem("klin.pendingSignupUsername") || "");
        setVerificationPending(true);
        setMessage("Your signup is saved. Enter the six-digit code from your email to continue.");
      }
    } catch { /* Storage may be unavailable; signup still works in the current tab. */ }
  }, [mode]);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(initialError === "callback"
    ? "Your sign-in link could not be verified. Request a new link or sign in again."
    : "");
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(""); setMessage(""); setBusy(true);
    const loadingStartedAt = Date.now();
    let redirectAfterLoading = false;
    try {
      if (mode === "login") {
        const supabase = createSupabaseBrowserClient();
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        redirectAfterLoading = true;
      } else if (verificationPending) {
        const supabase = createSupabaseBrowserClient();
        const { error: verifyError } = await supabase.auth.verifyOtp({ email: email.trim(), token: verificationCode.trim(), type: "email" });
        if (verifyError) {
          const code = (verifyError as { code?: string }).code || "";
          const messageText = verifyError.message.toLowerCase();
          const expired = code === "otp_expired" || code === "token_expired" || messageText.includes("expired");
          throw new Error(expired ? "Verification code is expired." : "Verification code is invalid.");
        }
        try { window.localStorage.removeItem("klin.pendingSignupEmail"); window.localStorage.removeItem("klin.pendingSignupUsername"); } catch { /* Ignore storage cleanup errors. */ }
        redirectAfterLoading = true;
      } else {
        const response = await fetch("/api/auth/signup", {
          method: "POST", credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password, username }),
        });
        const data = await response.json() as { message?: string; error?: string };
        if (!response.ok) throw new Error(data.error || "Unable to create your account.");
        setPassword(""); setVerificationPending(true);
        try { window.localStorage.setItem("klin.pendingSignupEmail", email.trim()); window.localStorage.setItem("klin.pendingSignupUsername", username); } catch { /* Keep current-tab flow working if storage is unavailable. */ }
        setMessage(data.message || "Check your email for an six-digit verification code from Klin.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed. Try again.");
    } finally {
      // Keep the branded loading screen visible for at least 3.5 seconds,
      // while allowing slower authentication requests to take as long as needed.
      const remainingMinimum = Math.max(0, 3500 - (Date.now() - loadingStartedAt));
      if (remainingMinimum > 0) await new Promise(resolve => setTimeout(resolve, remainingMinimum));
      if (!redirectAfterLoading) setBusy(false);
    }
    if (redirectAfterLoading) { router.replace("/"); router.refresh(); }
  };

  const title = mode === "login" ? "Welcome back." : verificationPending ? "Check your email." : "Create your Klin account.";

  return (
    <main className={"auth-page " + (mode === "signup" ? "auth-page-signup" : "auth-page-login")}>
      <section className="auth-panel">
        <Link className="auth-brand" href="/" aria-label="Klin home"><img src="/klin-logo.webp" alt="Klin" className="h-10 w-auto" /></Link>
        <div className="auth-kicker">{mode === "login" ? "WELCOME BACK TO KLIN" : "START WITH KLIN"}</div>
        <h1>{title}</h1>
        <p className="auth-intro">{mode === "login" ? "Sign in to continue to your conversations and workspace." : verificationPending ? "Enter the six-digit code we sent to your email to activate your account." : "Create a workspace account for your conversations, projects, and tools."}</p>
        <form onSubmit={submit} className="auth-form">
          {mode === "signup" && !verificationPending && <><label htmlFor="username">Username</label><div className="auth-input-wrap"><input id="username" type="text" autoComplete="username" required minLength={4} maxLength={49} value={username} onChange={e => setUsername(e.target.value)} placeholder="Choose a username" /></div><p className="auth-email-help">Use any name you like, from 4 to 49 characters.</p></>}
          <label htmlFor="email">Email address</label>
          <div className="auth-input-wrap"><Mail size={17} /><input id="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" readOnly={mode === "signup" && verificationPending} /></div>
          {mode === "signup" && verificationPending ? <>
            <label htmlFor="verification-code">Six-digit email code</label>
            <div className="auth-input-wrap"><LockKeyhole size={17} /><input id="verification-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} minLength={6} required value={verificationCode} onChange={e => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" /></div>
          </> : <>
            <label htmlFor="password">Password</label>
            <div className="auth-input-wrap"><LockKeyhole size={17} /><input id="password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "signup" ? 8 : 1} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" /><button className="auth-show-password" type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
          </>}
          {error && <p className="auth-alert auth-error" role="alert">{error}</p>}
          {message && <p className="auth-alert auth-message" role="status">{message}</p>}
          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? <><span className="auth-button-spinner" /> {mode === "login" ? "Signing in…" : verificationPending ? "Verifying…" : "Creating account…"}</> : <>{mode === "login" ? "Sign in" : verificationPending ? "Verify email and continue" : "Create account"} <ArrowRight size={17} /></>}
          </button>
          {mode === "signup" && verificationPending && <a className="auth-gmail-link" href="https://mail.google.com/mail/u/0/#inbox" target="_blank" rel="noopener noreferrer">Open Gmail in a new tab</a>}
          {mode === "signup" && verificationPending && <button className="auth-secondary" type="button" onClick={() => { setVerificationPending(false); setVerificationCode(""); setMessage(""); setError(""); try { window.localStorage.removeItem("klin.pendingSignupEmail"); } catch { /* Ignore storage cleanup errors. */ } }}>I forgot this email / I no longer use it — change email</button>}
        </form>
        {mode === "signup" && verificationPending && <p className="auth-email-help">Can’t access this inbox? <Link href="/support">Contact Klin Support</Link> if you need help recovering access.</p>}
        {mode === "login" && <p className="auth-forgot"><Link href="/forgot-password">Forgot password?</Link></p>}
        <p className="auth-switch">{mode === "login" ? "New to Klin?" : "Already have an account?"} <Link href={mode === "login" ? "/signup" : "/login"}>{mode === "login" ? "Sign up for Klin" : "Sign in instead"}</Link></p>
        <p className="auth-support-link">Need help? <Link href="/support">Contact Klin Support without an account</Link></p>
        <p className="auth-footnote">Your account is protected by Klin&apos;s authenticated session and private conversation access controls.</p>
      </section>
      <aside className="auth-side">
        <div className="auth-orb auth-orb-one" /><div className="auth-orb auth-orb-two" />
        <div className="auth-side-content">
          <div className="auth-side-label"><span /> {mode === "login" ? "YOUR KLIN WORKSPACE" : "A NEW WORKSPACE STARTS HERE"}</div>
          <h2>{mode === "login" ? "Pick up where your work left off." : "Bring your ideas into one place."}</h2>
          <p>{mode === "login" ? "Your projects and conversations are ready when you sign in." : "Create an account to organize projects, conversations, and the tools you use."}</p>
          <div className="auth-side-grid"><span>PRIVATE BY DEFAULT</span><span>BUILT TO EXPAND</span><span>ONE WORKSPACE</span></div>
        </div>
      </aside>
      {busy && <KlinLoading title={mode === "login" ? "Opening your workspace" : verificationPending ? "Verifying your email" : "Creating your workspace"} subtitle="Klin is securely processing your request." />}
    </main>
  );
}
