"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CreditCard, ExternalLink, LoaderCircle, ShieldCheck, UserRound } from "lucide-react";

type Profile = { full_name?: string | null; username?: string | null; display_name?: string | null; bio?: string | null; avatar_url?: string | null };
type Subscription = { id: string; plan_code: string; status: string; current_period_end: string | null; cancel_at_period_end: boolean };

const label = (code: string) => code.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function AccountOverview({ email }: { email: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalBusy, setPortalBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/account/me", { credentials: "same-origin", cache: "no-store" }).then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load your profile.");
        return data.profile as Profile;
      }),
      fetch("/api/subscriptions", { credentials: "same-origin", cache: "no-store" }).then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load subscriptions.");
        return (data.subscriptions ?? []) as Subscription[];
      }),
    ]).then(([nextProfile, nextSubscriptions]) => {
      if (!active) return;
      setProfile(nextProfile);
      setSubscriptions(nextSubscriptions);
    }).catch((caught) => {
      if (active) setError(caught instanceof Error ? caught.message : "Unable to load account information.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const openBillingPortal = async () => {
    setPortalBusy(true);
    setError("");
    try {
      const response = await fetch("/api/billing/portal", { method: "POST", credentials: "same-origin" });
      const data = await response.json();
      if (!response.ok || typeof data.url !== "string") throw new Error(data.error || "Billing management is unavailable.");
      window.location.assign(data.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to open billing management.");
      setPortalBusy(false);
    }
  };

  const current = subscriptions.find((item) => ["active", "trialing", "past_due"].includes(item.status)) ?? subscriptions[0] ?? null;
  const displayName = profile?.display_name || profile?.full_name || (profile?.username ? "@" + profile.username : "Klin member");

  return (
    <main className="klin-account-page">
      <header className="klin-account-heading">
        <div><div className="klin-eyebrow"><span /> ACCOUNT CENTER</div><h1>Your account</h1><p>Manage your Klin identity, notifications, security, and subscription.</p></div>
      </header>
      {error && <p className="klin-account-alert" role="alert">{error}</p>}
      <section className="klin-account-card">
        <div className="klin-account-card-icon"><UserRound size={20} /></div>
        <div className="klin-account-card-body">
          <div className="klin-account-label">PROFILE</div>
          <h2>{loading ? "Loading profile…" : displayName}</h2>
          <p>{email || "Email unavailable"}{profile?.username ? " · @" + profile.username : ""}</p>
          {profile?.bio && <p>{profile.bio}</p>}
        </div>
        <Link className="klin-account-action" href="/settings">Edit profile <ExternalLink size={14} /></Link>
      </section>
      <section className="klin-account-card">
        <div className="klin-account-card-icon"><CreditCard size={20} /></div>
        <div className="klin-account-card-body">
          <div className="klin-account-label">SUBSCRIPTION & BILLING</div>
          <h2>{loading ? "Checking your plan…" : current ? label(current.plan_code) : "No paid subscription found"}</h2>
          <p>{current ? `Status: ${label(current.status)}${current.current_period_end ? " · Renews or ends " + new Date(current.current_period_end).toLocaleDateString() : ""}${current.cancel_at_period_end ? " · Cancellation scheduled" : ""}` : "You can compare Klin plans and choose an available subscription."}</p>
          <div className="klin-account-actions">
            <Link className="klin-account-action" href="/plans">Compare plans</Link>
            <button className="klin-account-action" type="button" onClick={() => void openBillingPortal()} disabled={portalBusy || loading}>
              {portalBusy ? <LoaderCircle size={14} className="klin-account-spin" /> : <CreditCard size={14} />}
              Manage payment method / subscription
            </button>
          </div>
          <small>Payment management opens Stripe&apos;s secure customer portal when a billing account is linked.</small>
        </div>
      </section>
      <section className="klin-account-card">
        <div className="klin-account-card-icon"><Bell size={20} /></div>
        <div className="klin-account-card-body">
          <div className="klin-account-label">NOTIFICATIONS</div>
          <h2>Stay up to date</h2>
          <p>Review account alerts and choose available notification controls.</p>
          <div className="klin-account-actions">
            <Link className="klin-account-action" href="/notifications">Open notification center</Link>
            <Link className="klin-account-action" href="/settings">Account settings</Link>
          </div>
        </div>
      </section>
      <section className="klin-account-card">
        <div className="klin-account-card-icon"><ShieldCheck size={20} /></div>
        <div className="klin-account-card-body">
          <div className="klin-account-label">SECURITY</div>
          <h2>Account protection</h2>
          <p>Update your password and review your account identity settings.</p>
          <Link className="klin-account-action" href="/settings">Security settings</Link>
        </div>
      </section>
    </main>
  );
}
