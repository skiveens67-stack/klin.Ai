"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import OfflineProjectDrafts from "@/components/offline/OfflineProjectDrafts";
import BuildEstimator from "@/components/projects/BuildEstimator";
import { CheckCheck, Plus, RefreshCw } from "lucide-react";

export type ModuleKey =
  | "projects" | "marketplace" | "social" | "learning" | "wallet"
  | "notifications" | "family" | "devices" | "communications"
  | "checkins" | "trusted-contacts";

type Field = {
  name: string;
  label: string;
  type?: "text" | "number" | "textarea" | "select" | "checkbox";
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  help?: string;
};

type ModuleConfig = {
  title: string;
  description: string;
  endpoint: string;
  collection: string;
  formMethod?: "POST" | "PUT";
  fields?: Field[];
  note?: string;
};

const configs: Record<ModuleKey, ModuleConfig> = {
  projects: {
    title: "Projects",
    description: "Create and organize your websites, apps, games, and other creator projects.",
    endpoint: "/api/projects",
    collection: "projects",
    fields: [
      { name: "title", label: "Project name", required: true, placeholder: "My new project" },
      { name: "project_type", label: "Project type", type: "select", required: true, options: [
        { value: "website", label: "Website" }, { value: "app", label: "App" }, { value: "game", label: "Game" },
        { value: "music", label: "Music" }, { value: "image", label: "Image" }, { value: "video", label: "Video" }, { value: "other", label: "Other" },
      ] },
      { name: "description", label: "Description", type: "textarea", placeholder: "What are you building?" },
    ],
    note: "New projects are private drafts. Publishing is gated until moderation is available.",
  },
  marketplace: {
    title: "Marketplace",
    description: "Prepare creator projects for listing. New listings remain drafts until moderation and payment compliance are enabled.",
    endpoint: "/api/marketplace/listings",
    collection: "listings",
    fields: [
      { name: "project_id", label: "Project ID", required: true, placeholder: "Paste the ID of one of your projects" },
      { name: "listing_type", label: "Listing type", type: "select", required: true, options: [
        { value: "fixed_price", label: "Fixed price" }, { value: "auction", label: "Auction" },
      ] },
      { name: "price_minor", label: "Price in minor currency units (e.g. cents)", type: "number", placeholder: "Only for fixed-price listings", help: "A value of 1500 represents $15.00 when the listing currency is USD." },
    ],
    note: "Listings are saved as drafts. Orders, payouts, and public listing activation are not enabled. Business Exchange, escrow, valuation and handover remain unavailable until verified 21+ eligibility, seller/buyer checks, legal review and an approved settlement model are implemented.",
  },
  social: {
    title: "Klin Social",
    description: "Write posts for your creator profile. Posts are saved as drafts until moderation is connected.",
    endpoint: "/api/social/posts",
    collection: "posts",
    fields: [
      { name: "body", label: "Post", type: "textarea", required: true, placeholder: "What are you working on?" },
      { name: "visibility", label: "Visibility", type: "select", required: true, options: [
        { value: "public", label: "Public (draft until moderation)" }, { value: "followers", label: "Followers" }, { value: "private", label: "Private" },
      ] },
    ],
    note: "Creating a post does not publish it. A moderation service must approve public content.",
  },
  learning: {
    title: "Learning",
    description: "Track course progress and scores in your Klin account.",
    endpoint: "/api/learning/progress",
    collection: "progress",
    formMethod: "PUT",
    fields: [
      { name: "course_key", label: "Course key", required: true, placeholder: "e.g. ai-basics" },
      { name: "progress_percent", label: "Progress (%)", type: "number", required: true, placeholder: "0–100" },
      { name: "score", label: "Score (%)", type: "number", placeholder: "Optional" },
    ],
  },
  wallet: {
    title: "Klin Wallet",
    description: "Review your Purchased Gems, Subscription Gems, transaction history, and subscription status.",
    endpoint: "/api/wallet",
    collection: "transactions",
    note: "Purchased Gems can be used for eligible Klin Store purchases. Subscription and promotional Gems are kept separate and cannot be spent in the Store. Credits are issued only by verified server-side payment events. Marketplace seller onboarding, earnings transfers and withdrawals are not active yet.",
  },
  notifications: {
    title: "Notifications",
    description: "Review account notifications and mark them as read.",
    endpoint: "/api/notifications",
    collection: "notifications",
  },
  family: {
    title: "Family Hub",
    description: "Create your family space. Managed profiles and trusted membership are controlled by account ownership.",
    endpoint: "/api/family",
    collection: "families",
    fields: [{ name: "name", label: "Family name", required: true, placeholder: "The family" }],
    note: "One family per owner account. Up to five managed profiles are supported by the backend.",
  },
  devices: {
    title: "Devices",
    description: "Register supported devices to your account. Registration does not connect hardware or send commands.",
    endpoint: "/api/devices",
    collection: "devices",
    fields: [
      { name: "name", label: "Device name", required: true, placeholder: "My device" },
      { name: "device_type", label: "Device type", type: "select", required: true, options: [
        { value: "thangie_rover", label: "Thangie rover" }, { value: "drone", label: "Drone" }, { value: "incense_tracker", label: "Incense tracker" },
      ] },
    ],
    note: "The API only registers devices. Hardware control remains disabled until a secure gateway and firmware safety controls are ready.",
  },
  communications: {
    title: "Communication Permissions",
    description: "Set the permission tier Klin should use for each communication channel.",
    endpoint: "/api/communications/rules",
    collection: "rules",
    formMethod: "PUT",
    fields: [
      { name: "channel", label: "Channel", type: "select", required: true, options: [
        { value: "sms", label: "SMS" }, { value: "email", label: "Email" }, { value: "whatsapp", label: "WhatsApp" },
        { value: "discord", label: "Discord" }, { value: "slack", label: "Slack" }, { value: "phone", label: "Phone" },
      ] },
      { name: "permission_tier", label: "Permission tier", type: "select", required: true, options: [
        { value: "ask_first", label: "Ask first" }, { value: "trusted_circle_auto", label: "Trusted circle auto" }, { value: "full_proxy", label: "Full proxy" },
      ] },
      { name: "enabled", label: "Enable this rule", type: "checkbox" },
    ],
    note: "These settings are stored only. No SMS, email, voice, WhatsApp, Discord, or Slack worker is enabled.",
  },
  checkins: {
    title: "Safety Check-ins",
    description: "Create a check-in schedule and optionally associate one of your trusted contacts.",
    endpoint: "/api/checkins",
    collection: "checkins",
    fields: [
      { name: "cadence_minutes", label: "Check-in interval (minutes)", type: "number", required: true, placeholder: "60" },
      { name: "emergency_contact_id", label: "Emergency contact ID (optional)", placeholder: "Paste a trusted contact ID" },
    ],
    note: "Schedules are stored, but automatic reminders and emergency escalation are not active.",
  },
  "trusted-contacts": {
    title: "Trusted Contacts",
    description: "Store a trusted contact destination using the server-side encryption workflow.",
    endpoint: "/api/trusted-contacts",
    collection: "contacts",
    fields: [
      { name: "display_name", label: "Contact name", required: true, placeholder: "Contact name" },
      { name: "channel", label: "Channel", type: "select", required: true, options: [
        { value: "sms", label: "SMS" }, { value: "email", label: "Email" }, { value: "whatsapp", label: "WhatsApp" },
        { value: "discord", label: "Discord" }, { value: "slack", label: "Slack" }, { value: "phone", label: "Phone" },
      ] },
      { name: "contact_value", label: "Contact destination", required: true, placeholder: "Email or international phone number" },
      { name: "priority", label: "Priority", type: "number", placeholder: "100" },
      { name: "is_emergency", label: "Emergency contact", type: "checkbox" },
    ],
    note: "Destinations are encrypted server-side. New contacts are not verified and no external contact is messaged.",
  },
};

type ApiPayload = Record<string, unknown>;
type Row = Record<string, unknown>;

function pretty(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default function WorkspaceModule({ module }: { module: ModuleKey }) {
  const config = configs[module];
  const [payload, setPayload] = useState<ApiPayload>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(config.endpoint, { credentials: "same-origin", cache: "no-store" });
      const data = await response.json() as ApiPayload;
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Unable to load this section.");
      if (module === "wallet") {
        const subscriptionResponse = await fetch("/api/subscriptions", { credentials: "same-origin", cache: "no-store" });
        const subscriptions = await subscriptionResponse.json() as ApiPayload;
        if (!subscriptionResponse.ok) throw new Error(typeof subscriptions.error === "string" ? subscriptions.error : "Unable to load subscriptions.");
        data.subscriptions = subscriptions.subscriptions;
      }
      setPayload(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load this section.");
    } finally {
      setLoading(false);
    }
  }, [config.endpoint, module]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const onSynced = () => { void load(); };
    window.addEventListener("klin:projects-synced", onSynced);
    return () => window.removeEventListener("klin:projects-synced", onSynced);
  }, [load]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!config.fields || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const formElement = event.currentTarget;
    const form = new FormData(formElement);
      const body: Record<string, unknown> = {};
      for (const field of config.fields) {
        const raw = form.get(field.name);
        if (field.type === "checkbox") {
          body[field.name] = raw === "on";
        } else if (raw !== null && String(raw).trim() !== "") {
          body[field.name] = field.type === "number" ? Number(raw) : String(raw).trim();
        }
      }
      const response = await fetch(config.endpoint, {
        method: config.formMethod ?? "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json() as ApiPayload;
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Unable to save this item.");
      setNotice(typeof data.note === "string" ? data.note : "Saved.");
      formElement.reset();
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save this item.");
    } finally {
      setBusy(false);
    }
  };

  const markAllRead = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(config.endpoint, {
        method: "PATCH", credentials: "same-origin",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mark_all: true }),
      });
      const data = await response.json() as ApiPayload;
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Unable to update notifications.");
      setNotice("All notifications marked as read.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update notifications.");
    } finally {
      setBusy(false);
    }
  };

  const rows = Array.isArray(payload[config.collection]) ? payload[config.collection] as Row[] : [];
  const wallet = payload.wallet && typeof payload.wallet === "object" ? payload.wallet as Row : null;
  const subscriptions = Array.isArray(payload.subscriptions) ? payload.subscriptions as Row[] : [];

  return (
    <main className="module-page">
      <header className="module-header">
        <div><div className="module-eyebrow">KLIN WORKSPACE</div><h1>{config.title}</h1><p>{config.description}</p></div>
        <button type="button" className="module-refresh" onClick={() => void load()} disabled={loading || busy}><RefreshCw size={15} /> Refresh</button>
      </header>

      {config.note && <div className="module-note">{config.note}</div>}
      {module === "projects" && <><BuildEstimator /><OfflineProjectDrafts /></>}
      {error && <div className="module-alert module-alert-error" role="alert">{error}</div>}
      {notice && <div className="module-alert module-alert-info" role="status">{notice}</div>}

      {config.fields && (
        <section className="module-card">
          <div className="module-card-title"><Plus size={17} /><h2>{module === "learning" || module === "communications" ? "Update record" : "Create new"}</h2></div>
          <form className="module-form" onSubmit={submit}>
            {config.fields.map((field) => (
              <div className={field.type === "checkbox" ? "module-checkbox-field" : "module-field"} key={field.name}>
                {field.type === "checkbox" ? (
                  <label><input type="checkbox" name={field.name} defaultChecked={field.name === "enabled"} /> {field.label}</label>
                ) : (
                  <>
                    <label htmlFor={field.name}>{field.label}{field.required ? " *" : ""}</label>
                    {field.type === "select" ? (
                      <select id={field.name} name={field.name} required={field.required} defaultValue={field.options?.[0]?.value ?? ""}>
                        {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    ) : field.type === "textarea" ? (
                      <textarea id={field.name} name={field.name} required={field.required} placeholder={field.placeholder} rows={4} maxLength={4000} />
                    ) : (
                      <input id={field.name} name={field.name} type={field.type ?? "text"} required={field.required} placeholder={field.placeholder} min={field.type === "number" ? 0 : undefined} />
                    )}
                    {field.help && <small>{field.help}</small>}
                  </>
                )}
              </div>
            ))}
            <button type="submit" className="module-submit" disabled={busy}>{busy ? "Saving…" : config.formMethod === "PUT" ? "Save changes" : "Create draft"}</button>
          </form>
        </section>
      )}

      {module === "notifications" && rows.length > 0 && rows.some((row) => !row.read_at) && (
        <button className="module-secondary-action" type="button" onClick={() => void markAllRead()} disabled={busy}><CheckCheck size={15} /> Mark all as read</button>
      )}

      {module === "wallet" && (
        <>
          <section className="module-balance-card"><span>Total Gems</span><strong>{pretty(wallet?.balance_gems ?? 0)} <small>GEMS</small></strong><p>Combined wallet balance</p></section>
          <section className="module-balance-card"><span>Purchased Gems</span><strong>{pretty(wallet?.purchased_gems ?? 0)} <small>GEMS</small></strong><p>Available for eligible Klin Store purchases</p></section>
          <section className="module-balance-card"><span>Subscription Gems</span><strong>{pretty(wallet?.subscription_gems ?? 0)} <small>GEMS</small></strong><p>For eligible AI and Klin features; not spendable in the Store</p></section>
          <section className="module-card"><div className="module-card-title"><h2>Subscriptions</h2></div>{subscriptions.length === 0 ? <p className="module-empty">No subscription records yet.</p> : <RecordList rows={subscriptions} />}</section>
        </>
      )}

      <section className="module-card">
        <div className="module-card-title"><h2>{module === "wallet" ? "Recent transactions" : module === "notifications" ? "Your notifications" : "Saved records"}</h2><span className="module-count">{rows.length}</span></div>
        {loading ? <p className="module-empty">Loading…</p> : rows.length === 0 ? <p className="module-empty">Nothing here yet.</p> : <RecordList rows={rows} />}
      </section>
    </main>
  );
}

function RecordList({ rows }: { rows: Row[] }) {
  return (
    <div className="module-record-list">
      {rows.map((row, index) => {
        const id = typeof row.id === "string" ? row.id : String(index);
        const title = String(row.title ?? row.name ?? row.display_name ?? row.course_key ?? row.category ?? row.transaction_type ?? row.channel ?? row.id ?? "Record");
        const entries = Object.entries(row).filter(([key]) => !["id", "metadata", "rule_config", "controls"].includes(key));
        return (
          <article className="module-record" key={id}>
            <div className="module-record-title">{title}</div>
            <dl>{entries.slice(0, 8).map(([key, value]) => <div key={key}><dt>{key.replaceAll("_", " ")}</dt><dd>{pretty(value)}</dd></div>)}</dl>
          </article>
        );
      })}
    </div>
  );
}
