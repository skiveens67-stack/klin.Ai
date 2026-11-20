"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function SettingsPanel({ email }: { email: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const updatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("");
    setError("");
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setPassword("");
      setConfirmPassword("");
      setStatus("Your password has been updated.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update your password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="settings-page">
      <div className="settings-heading">
        <div className="settings-eyebrow">KLIN WORKSPACE</div>
        <h1>Settings</h1>
        <p>Manage your sign-in details and account security.</p>
      </div>
      <section className="settings-card">
        <div className="settings-card-heading"><ShieldCheck size={18} /><div><h2>Account</h2><p>Your current signed-in identity.</p></div></div>
        <div className="settings-field"><span>Email address</span><strong>{email || "Unavailable"}</strong></div>
      </section>
      <section className="settings-card">
        <div className="settings-card-heading"><KeyRound size={18} /><div><h2>Change password</h2><p>Choose a unique password with at least 8 characters.</p></div></div>
        <form className="settings-form" onSubmit={updatePassword}>
          <label htmlFor="new-password">New password</label>
          <input id="new-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} />
          <label htmlFor="confirm-password">Confirm new password</label>
          <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
          {error && <p className="settings-error" role="alert">{error}</p>}
          {status && <p className="settings-success" role="status">{status}</p>}
          <button type="submit" disabled={busy}>{busy ? "Updating…" : "Update password"}</button>
        </form>
      </section>
    </main>
  );
}
