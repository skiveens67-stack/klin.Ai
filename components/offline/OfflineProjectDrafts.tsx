"use client";

import { useCallback, useEffect, useState } from "react";
import { CloudUpload, HardDrive, Trash2 } from "lucide-react";

type Draft = { id: string; title: string; project_type: string; description: string; created_at: string };
const DB_NAME = "klin-offline";
const STORE = "project-drafts";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Local draft storage is unavailable."));
  });
}

async function allDrafts(): Promise<Draft[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    request.onsuccess = () => { db.close(); resolve(request.result as Draft[]); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

async function saveDraft(draft: Draft): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readwrite").objectStore(STORE).put(draft);
    request.onsuccess = () => { db.close(); resolve(); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

async function removeDraft(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readwrite").objectStore(STORE).delete(id);
    request.onsuccess = () => { db.close(); resolve(); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

export default function OfflineProjectDrafts() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [title, setTitle] = useState("");
  const [projectType, setProjectType] = useState("website");
  const [description, setDescription] = useState("");
  const [online, setOnline] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try { setDrafts(await allDrafts()); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not read local drafts."); }
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    void refresh();
    const onlineHandler = () => { setOnline(true); };
    const offlineHandler = () => setOnline(false);
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);
    return () => { window.removeEventListener("online", onlineHandler); window.removeEventListener("offline", offlineHandler); };
  }, [refresh]);

  const save = async () => {
    if (!title.trim()) { setError("Enter a project name."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      await saveDraft({
        id: crypto.randomUUID(),
        title: title.trim(),
        project_type: projectType,
        description: description.trim(),
        created_at: new Date().toISOString(),
      });
      setTitle(""); setDescription("");
      setMessage("Saved on this device. It will sync when you are online.");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this draft.");
    } finally { setBusy(false); }
  };

  const sync = async () => {
    if (!navigator.onLine || busy) return;
    setBusy(true); setError(""); setMessage("");
    let synced = 0;
    try {
      const pending = await allDrafts();
      for (const draft of pending) {
        const response = await fetch("/api/projects", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json", "Idempotency-Key": draft.id },
          body: JSON.stringify({ title: draft.title, project_type: draft.project_type, description: draft.description }),
        });
        const data = await response.json() as { error?: string };
        if (!response.ok) throw new Error(data.error || `Could not sync "${draft.title}".`);
        await removeDraft(draft.id);
        synced += 1;
      }
      setMessage(synced ? `Synced ${synced} local project draft(s) to your Klin account.` : "No pending local drafts.");
      await refresh();
      window.dispatchEvent(new CustomEvent("klin:projects-synced"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sync paused. Your remaining drafts are still stored on this device.");
      await refresh();
    } finally { setBusy(false); }
  };

  const clear = async () => {
    if (!window.confirm("Delete all unsynced project drafts from this device? This cannot be undone.")) return;
    setBusy(true);
    try { for (const draft of await allDrafts()) await removeDraft(draft.id); setMessage("Local drafts deleted."); await refresh(); }
    catch { setError("Could not clear local drafts."); }
    finally { setBusy(false); }
  };

  return (
    <section className="module-card offline-drafts-card">
      <div className="module-card-title"><HardDrive size={17} /><h2>Offline project drafts</h2><span className="module-count">{drafts.length}</span></div>
      <p className="offline-drafts-copy">Save project ideas on this device without internet. When online, sync them to your signed-in Klin account.</p>
      <div className="offline-draft-form">
        <label htmlFor="offline-project-title">Project name</label>
        <input id="offline-project-title" value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder="My website or app idea" />
        <label htmlFor="offline-project-type">Project type</label>
        <select id="offline-project-type" value={projectType} onChange={(event) => setProjectType(event.target.value)}>
          <option value="website">Website</option><option value="app">App</option><option value="game">Game</option><option value="music">Music</option><option value="image">Image</option><option value="video">Video</option><option value="other">Other</option>
        </select>
        <label htmlFor="offline-project-description">Description</label>
        <textarea id="offline-project-description" value={description} maxLength={4000} rows={3} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the project…" />
        <div className="offline-draft-actions">
          <button type="button" className="module-submit" disabled={busy || !title.trim()} onClick={() => void save()}>Save on this device</button>
          <button type="button" className="module-refresh" disabled={busy || !online || drafts.length === 0} onClick={() => void sync()}><CloudUpload size={14} /> {busy ? "Working…" : "Sync drafts"}</button>
        </div>
      </div>
      {!online && <div className="module-alert module-alert-warning">Offline: drafts are stored locally. Sign-in, AI generation, cloud builds, publishing, and payments need internet.</div>}
      {error && <div className="module-alert module-alert-error" role="alert">{error}</div>}
      {message && <div className="module-alert module-alert-info" role="status">{message}</div>}
      {drafts.length > 0 && <div className="offline-pending-list">
        {drafts.map((draft) => <div className="offline-pending-row" key={draft.id}><div><strong>{draft.title}</strong><span>{draft.project_type} · saved {new Date(draft.created_at).toLocaleString()}</span></div><span className="offline-pending-tag">On this device</span></div>)}
        <button type="button" className="offline-clear-button" disabled={busy} onClick={() => void clear()}><Trash2 size={13} /> Delete local drafts</button>
      </div>}
      <p className="offline-privacy-note">Local drafts are not encrypted by Klin and may be visible to anyone using this browser profile. Do not store passwords, payment details, or highly sensitive information here.</p>
    </section>
  );
}
