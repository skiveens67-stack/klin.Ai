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
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

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
      const { error: updateError } = await supabase.auth.updateUser({ email: normalizedEmail });
      if (updateError) throw updateError;
      setNewEmail("");
      setEmailPassword("");
      setEmailStatus("Email change requested. Check your current and new email inboxes for confirmation links. Your sign-in email changes only after confirmation.");
    } catch (caught) {
      setEmailError(caught instanceof Error ? caught.message : "Could not request an email change.");
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
      await verifyCurrentPassword(supabase, currentPassword);
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      setStatus("Your password has been updated.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update your password.");
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
        <form className="settings-form" onSubmit={updateEmail}>
          <label htmlFor="new-email">New email address</label>
          <input id="new-email" type="email" autoComplete="email" maxLength={254} required value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder="you@example.com" />
          <label htmlFor="email-current-password">Current password</label>
          <input id="email-current-password" type="password" autoComplete="current-password" maxLength={128} required value={emailPassword} onChange={(event) => setEmailPassword(event.target.value)} />
          <small className="settings-help">Klin will send confirmation links to your current and new email addresses. The change is not complete until the required confirmations are finished.</small>
          {emailError && <p className="settings-error" role="alert">{emailError}</p>}
          {emailStatus && <p className="settings-success" role="status">{emailStatus}</p>}
          <button type="submit" disabled={emailBusy}><Mail size={14} /> {emailBusy ? "Requesting change…" : "Change email"}</button>
        </form>
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
        <form className="settings-form" onSubmit={updatePassword}>
          <label htmlFor="current-password">Current password</label>
          <input id="current-password" type="password" autoComplete="current-password" maxLength={128} required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
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
