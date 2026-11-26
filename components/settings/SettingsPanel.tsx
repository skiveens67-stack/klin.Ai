"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { KeyRound, Mail, Save, ShieldCheck, UserRound } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Profile = {
  full_name: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

export default function SettingsPanel({ email }: { email: string }) {
  const [profile, setProfile] = useState<Profile>({ full_name: "", username: "", display_name: "", avatar_url: "", bio: "" });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileStatus, setProfileStatus] = useState("");
  const [profileError, setProfileError] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailStatus, setEmailStatus] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailChallengeId, setEmailChallengeId] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [passwordChallengeId, setPasswordChallengeId] = useState("");
  const [passwordCode, setPasswordCode] = useState("");

  useEffect(() => {
    let cancelled = false;
    const loadProfile = async () => {
      try {
        const response = await fetch("/api/account/me", { credentials: "same-origin", cache: "no-store" });
        const data = await response.json() as { profile?: Profile; error?: string };
        if (!response.ok) throw new Error(data.error || "Unable to load profile.");
        if (!cancelled && data.profile) setProfile({
          full_name: data.profile.full_name ?? "",
          username: data.profile.username ?? "",
          display_name: data.profile.display_name ?? "",
          avatar_url: data.profile.avatar_url ?? "",
          bio: data.profile.bio ?? "",
        });
      } catch (caught) {
        if (!cancelled) setProfileError(caught instanceof Error ? caught.message : "Unable to load profile.");
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    };
    void loadProfile();
    return () => { cancelled = true; };
  }, []);

  const updateProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingProfile(true);
    setProfileError("");
    setProfileStatus("");
    try {
      const response = await fetch("/api/account/me", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: profile.full_name,
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url || null,
          bio: profile.bio || null,
        }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to save profile.");
      setProfileStatus("Your profile has been updated.");
    } catch (caught) {
      setProfileError(caught instanceof Error ? caught.message : "Unable to save profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const verifyCurrentPassword = async (supabase: ReturnType<typeof createSupabaseBrowserClient>, passwordToVerify: string) => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.email) throw new Error("Your signed-in account could not be verified. Sign in again and retry.");
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: passwordToVerify,
    });
    if (signInError) throw new Error("Your current password is incorrect. Please check it and try again.");
  };

  const updateEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmailStatus("");
    setEmailError("");
    const normalizedEmail = newEmail.trim().toLowerCase();
    if (!normalizedEmail || normalizedEmail === email.toLowerCase()) {
      setEmailError("Enter a new email address that is different from your current one.");
      return;
    }
    if (!emailPassword) {
      setEmailError("Enter your current password to confirm this change.");
      return;
    }
    setEmailBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await verifyCurrentPassword(supabase, emailPassword);
      const response = await fetch("/api/account/security-change/request", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changeType: "email", newEmail: normalizedEmail, currentPassword: emailPassword }),
      });
      const data = await response.json() as { challengeId?: string; message?: string; error?: string };
      if (!response.ok || !data.challengeId) throw new Error(data.error || "Could not start email verification.");
      setEmailChallengeId(data.challengeId);
      setEmailCode("");
      setEmailPassword("");
      setEmailStatus(data.message || "A verification code was sent. The email change is still pending.");
    } catch (caught) {
      setEmailError(caught instanceof Error ? caught.message : "Could not request an email change.");
    } finally {
      setEmailBusy(false);
    }
  };

  const confirmEmailChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmailBusy(true);
    setEmailError("");
    setEmailStatus("");
    try {
      const response = await fetch("/api/account/security-change/confirm", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: emailChallengeId, code: emailCode }),
      });
      const data = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "Email verification failed.");
      setEmailChallengeId("");
      setEmailCode("");
      setNewEmail("");
      setEmailStatus(data.message || "Verification passed. Complete the confirmation links to finish changing your email.");
    } catch (caught) {
      setEmailError(caught instanceof Error ? caught.message : "Email verification failed.");
    } finally {
      setEmailBusy(false);
    }
  };

  const updatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("");
    setError("");
    if (!currentPassword) {
      setError("Enter your current password to confirm this change.");
      return;
    }
    if (password.length < 8 || password.length > 128) {
      setError("Use a password between 8 and 128 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await verifyCurrentPassword(supabase, currentPassword);
      const response = await fetch("/api/account/security-change/request", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changeType: "password", currentPassword }),
      });
      const data = await response.json() as { challengeId?: string; message?: string; error?: string };
      if (!response.ok || !data.challengeId) throw new Error(data.error || "Could not start password verification.");
      setPasswordChallengeId(data.challengeId);
      setPasswordCode("");
      setCurrentPassword("");
      setStatus(data.message || "A verification code was sent. Your password has not changed.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not request a password change.");
    } finally {
      setBusy(false);
    }
  };

  const confirmPasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const response = await fetch("/api/account/security-change/confirm", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: passwordChallengeId, code: passwordCode, newPassword: password }),
      });
      const data = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "Password verification failed.");
      setPasswordChallengeId("");
      setPasswordCode("");
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      setStatus(data.message || "Your password has been updated.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Password verification failed.");
    } finally {
      setBusy(false);
    }
  };

  const changeProfile = (key: keyof Profile, value: string) => setProfile((current) => ({ ...current, [key]: value }));

  return (
    <main className="settings-page">
      <div className="settings-heading">
        <div className="settings-eyebrow">KLIN WORKSPACE</div>
        <h1>Settings</h1>
        <p>Manage your profile, sign-in details, and account security.</p>
      </div>
      <section className="settings-card">
        <div className="settings-card-heading"><ShieldCheck size={18} /><div><h2>Account</h2><p>Your current signed-in identity.</p></div></div>
        <div className="settings-field"><span>Current email address</span><strong>{email || "Unavailable"}</strong></div>
      </section>
      <section className="settings-card" id="email">
        <div className="settings-card-heading"><Mail size={18} /><div><h2>Change email address</h2><p>Confirm your identity before changing the email used to sign in.</p></div></div>
        {!emailChallengeId ? (
          <form className="settings-form" onSubmit={updateEmail}>
            <label htmlFor="new-email">New email address</label>
            <input id="new-email" type="email" autoComplete="email" maxLength={254} required value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder="you@example.com" />
            <label htmlFor="email-current-password">Current password</label>
            <input id="email-current-password" type="password" autoComplete="current-password" maxLength={128} required value={emailPassword} onChange={(event) => setEmailPassword(event.target.value)} />
            <small className="settings-help">Klin sends a one-time code to your verified security email first. The email change is not submitted until you enter that code. Supabase then sends its separate email-change confirmation links.</small>
            {emailError && <p className="settings-error" role="alert">{emailError}</p>}
            {emailStatus && <p className="settings-success" role="status">{emailStatus}</p>}
            <button type="submit" disabled={emailBusy}><Mail size={14} /> {emailBusy ? "Sending code…" : "Send verification code"}</button>
          </form>
        ) : (
          <form className="settings-form" onSubmit={confirmEmailChange}>
            <p className="settings-help">Your requested email change is on hold. Enter the six-digit code sent to your verified security email. Nothing has changed yet.</p>
            <label htmlFor="email-security-code">Security verification code</label>
            <input id="email-security-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={emailCode} onChange={(event) => setEmailCode(event.target.value.replace(/\D/g, "").slice(0, 6))} />
            {emailError && <p className="settings-error" role="alert">{emailError}</p>}
            {emailStatus && <p className="settings-success" role="status">{emailStatus}</p>}
            <button type="submit" disabled={emailBusy || emailCode.length !== 6}>{emailBusy ? "Verifying…" : "Verify and continue"}</button>
          </form>
        )}
      </section>
      <section className="settings-card" id="profile">
        <div className="settings-card-heading"><UserRound size={18} /><div><h2>Profile</h2><p>Update the profile fields permitted by Klin.</p></div></div>
        {loadingProfile ? <p className="settings-muted">Loading profile…</p> : (
          <form className="settings-form" onSubmit={updateProfile}>
            <label htmlFor="full-name">Full name</label>
            <input id="full-name" maxLength={100} required value={profile.full_name ?? ""} onChange={(event) => changeProfile("full_name", event.target.value)} />
            <label htmlFor="display-name">Display name</label>
            <input id="display-name" maxLength={40} required value={profile.display_name ?? ""} onChange={(event) => changeProfile("display_name", event.target.value)} />
            <label htmlFor="username">Username</label>
            <input id="username" minLength={3} maxLength={20} pattern="[a-z0-9_]{3,20}" required value={profile.username ?? ""} onChange={(event) => changeProfile("username", event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} />
            <small className="settings-help">3–20 lowercase letters, numbers, or underscores.</small>
            <label htmlFor="avatar-url">Avatar URL (HTTPS)</label>
            <input id="avatar-url" type="url" value={profile.avatar_url ?? ""} onChange={(event) => changeProfile("avatar_url", event.target.value)} placeholder="https://…" />
            <label htmlFor="bio">Bio</label>
            <textarea id="bio" maxLength={300} rows={3} value={profile.bio ?? ""} onChange={(event) => changeProfile("bio", event.target.value)} placeholder="A short description" />
            {profileError && <p className="settings-error" role="alert">{profileError}</p>}
            {profileStatus && <p className="settings-success" role="status">{profileStatus}</p>}
            <button type="submit" disabled={savingProfile || loadingProfile}><Save size={14} /> {savingProfile ? "Saving…" : "Save profile"}</button>
          </form>
        )}
      </section>
      <section className="settings-card" id="security">
        <div className="settings-card-heading"><KeyRound size={18} /><div><h2>Change password</h2><p>Verify your current password before choosing a new one.</p></div></div>
        {!passwordChallengeId ? (
          <form className="settings-form" onSubmit={updatePassword}>
            <label htmlFor="current-password">Current password</label>
            <input id="current-password" type="password" autoComplete="current-password" maxLength={128} required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
            <label htmlFor="new-password">New password</label>
            <input id="new-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} />
            <label htmlFor="confirm-password">Confirm new password</label>
            <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
            <small className="settings-help">Klin sends a one-time code to your verified security email. Your new password is not saved or sent to the server until you enter that code.</small>
            {error && <p className="settings-error" role="alert">{error}</p>}
            {status && <p className="settings-success" role="status">{status}</p>}
            <button type="submit" disabled={busy}>{busy ? "Sending code…" : "Send verification code"}</button>
          </form>
        ) : (
          <form className="settings-form" onSubmit={confirmPasswordChange}>
            <p className="settings-help">Your password change is on hold. Enter the six-digit code sent to your verified security email. Your new password will only be applied after verification.</p>
            <label htmlFor="password-security-code">Security verification code</label>
            <input id="password-security-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={passwordCode} onChange={(event) => setPasswordCode(event.target.value.replace(/\D/g, "").slice(0, 6))} />
            {error && <p className="settings-error" role="alert">{error}</p>}
            {status && <p className="settings-success" role="status">{status}</p>}
            <button type="submit" disabled={busy || passwordCode.length !== 6}>{busy ? "Verifying…" : "Verify and update password"}</button>
          </form>
        )}
      </section>
    </main>
  );
}
