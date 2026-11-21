"use client";

import { useEffect, useState } from "react";
import { Download, FileUp, LockKeyhole, ShieldCheck, Trash2, UnlockKeyhole } from "lucide-react";
import { decryptKlinVault, encryptKlinVault, isKlinVaultEnvelope, type KlinVaultCategory, type KlinVaultEnvelope, type KlinVaultRecord } from "@/lib/v7-vault-crypto";

const STORAGE_KEY = "klin.v7.local-vault.v1";
const categoryLabels: Record<KlinVaultCategory, string> = {
  identity: "Identity record",
  biometric_pose: "Biometric pose vector",
  voice_print: "Voice print",
  gps: "GPS / location record",
  private_note: "Private note",
};

export default function V7Vault() {
  const [envelope, setEnvelope] = useState<KlinVaultEnvelope | null>(null);
  const [records, setRecords] = useState<KlinVaultRecord[]>([]);
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<KlinVaultCategory>("private_note");
  const [value, setValue] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (isKlinVaultEnvelope(parsed)) setEnvelope(parsed);
        else setError("The saved vault file is not recognized. Import a valid Klin V7 backup.");
      }
    } catch {
      setError("Klin could not read the local vault file.");
    }
  }, []);

  function storeEnvelope(next: KlinVaultEnvelope) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setEnvelope(next);
  }

  async function createVault() {
    if (passphrase.length < 12) { setError("Use a passphrase with at least 12 characters."); return; }
    if (passphrase !== confirmPassphrase) { setError("The passphrases do not match."); return; }
    setLoading(true); setError(""); setNotice("");
    try {
      const next = await encryptKlinVault([], passphrase);
      storeEnvelope(next);
      setRecords([]);
      setUnlocked(true);
      setConfirmPassphrase("");
      setNotice("Your encrypted V7 vault has been created on this device. Export a backup file and keep your passphrase safe.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the vault.");
    } finally { setLoading(false); }
  }

  async function unlockVault() {
    if (!envelope) return;
    setLoading(true); setError(""); setNotice("");
    try {
      const decrypted = await decryptKlinVault(envelope, passphrase);
      setRecords(decrypted);
      setUnlocked(true);
      setNotice("Vault unlocked. Records are decrypted in this browser session only.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not unlock the vault.");
    } finally { setLoading(false); }
  }

  async function saveRecords(nextRecords: KlinVaultRecord[]) {
    if (!passphrase || !unlocked) return;
    setLoading(true); setError(""); setNotice("");
    try {
      const nextEnvelope = await encryptKlinVault(nextRecords, passphrase);
      storeEnvelope(nextEnvelope);
      setRecords(nextRecords);
      setNotice("Encrypted vault saved locally. Klin&apos;s server did not receive the record contents or passphrase.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the vault.");
    } finally { setLoading(false); }
  }

  async function addRecord() {
    if (!title.trim() || !value.trim()) { setError("Enter a title and record value."); return; }
    const next: KlinVaultRecord[] = [...records, {
      id: crypto.randomUUID(),
      title: title.trim().slice(0, 120),
      category,
      value: value.trim().slice(0, 12000),
      createdAt: new Date().toISOString(),
    }];
    await saveRecords(next);
    setTitle(""); setValue("");
  }

  async function removeRecord(id: string) {
    await saveRecords(records.filter((record) => record.id !== id));
  }

  function exportBackup() {
    if (!envelope) return;
    const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "klin-v7-encrypted-vault.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Encrypted backup exported. Store it somewhere private; the file is useless without your passphrase.");
  }

  async function importBackup(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(""); setNotice("");
    try {
      if (file.size < 1 || file.size > 5 * 1024 * 1024) throw new Error("Vault backup must be 5 MB or smaller.");
      const parsed: unknown = JSON.parse(await file.text());
      if (!isKlinVaultEnvelope(parsed)) throw new Error("This is not a supported Klin V7 vault backup.");
      storeEnvelope(parsed);
      setUnlocked(false); setRecords([]); setPassphrase("");
      setNotice("Encrypted backup imported to this browser. Enter its passphrase to unlock it.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not import the vault backup.");
    } finally {
      event.target.value = "";
    }
  }

  function lockVault() {
    setUnlocked(false); setRecords([]); setPassphrase(""); setConfirmPassphrase("");
    setNotice("Vault locked. Decrypted records were cleared from the page state.");
  }

  return (
    <main className="module-page">
      <header className="module-header">
        <div><div className="module-eyebrow">KLIN V7 ULTRA SAFE · FREE</div><h1>V7 Secure Vault</h1><p>Private, client-side encrypted storage for identity, biometric, voice, location and personal records.</p></div>
      </header>
      <div className="module-alert module-alert-info"><strong><ShieldCheck size={16} className="inline mr-2" />V7 Ultra Safe is always on.</strong> The three V7 shields apply automatically: encrypted vaulting, private Dignity Shield assistance rules, and the 21+ Compliance Firewall. V7 is not a paid plan and cannot be disabled.</div>
      <div className="module-alert module-alert-warning">This early-access vault encrypts records in your browser using PBKDF2-SHA-256 and AES-256-GCM before saving the encrypted file to this browser&apos;s local storage. Klin&apos;s server does not receive the passphrase or plaintext records. There is no cloud sync or password recovery. If you lose the passphrase and encrypted backup, the data cannot be recovered. This implementation has not yet received an independent security audit.</div>

      {error && <div className="module-alert module-alert-error" role="alert">{error}</div>}
      {notice && <div className="module-alert module-alert-info" role="status">{notice}</div>}

      {!envelope && !unlocked && <section className="module-card">
        <div className="module-card-title"><LockKeyhole size={18} /><h2>Create your encrypted vault</h2></div>
        <div className="module-form">
          <div className="module-field"><label htmlFor="v7-new-pass">Create a strong vault passphrase (12+ characters)</label><input id="v7-new-pass" type="password" autoComplete="new-password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} /></div>
          <div className="module-field"><label htmlFor="v7-confirm-pass">Confirm passphrase</label><input id="v7-confirm-pass" type="password" autoComplete="new-password" value={confirmPassphrase} onChange={(event) => setConfirmPassphrase(event.target.value)} /></div>
          <button className="module-submit" type="button" disabled={loading} onClick={() => void createVault()}>{loading ? "Creating encrypted vault…" : "Create V7 vault"}</button>
        </div>
      </section>}

      {envelope && !unlocked && <section className="module-card">
        <div className="module-card-title"><UnlockKeyhole size={18} /><h2>Unlock your V7 vault</h2></div>
        <div className="module-form">
          <div className="module-field"><label htmlFor="v7-pass">Vault passphrase</label><input id="v7-pass" type="password" autoComplete="current-password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} /></div>
          <button className="module-submit" type="button" disabled={loading || passphrase.length < 12} onClick={() => void unlockVault()}>{loading ? "Unlocking…" : "Unlock vault"}</button>
          <label className="module-file-picker" htmlFor="v7-import"><FileUp size={16} /> Import encrypted backup</label>
          <input id="v7-import" type="file" accept="application/json,.json" onChange={(event) => void importBackup(event)} className="media-file-input" />
        </div>
      </section>}

      {unlocked && <section className="module-card">
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="module-card-title"><ShieldCheck size={18} /><h2>Your encrypted records · {records.length}</h2></div><div className="flex flex-wrap gap-2"><button className="module-refresh" type="button" onClick={exportBackup}><Download size={14} /> Export backup</button><button className="module-refresh" type="button" onClick={lockVault}><LockKeyhole size={14} /> Lock vault</button></div></div>
        <div className="module-form">
          <div className="module-field"><label htmlFor="v7-record-title">Record title</label><input id="v7-record-title" maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Private identity note" /></div>
          <div className="module-field"><label htmlFor="v7-record-category">Record type</label><select id="v7-record-category" value={category} onChange={(event) => setCategory(event.target.value as KlinVaultCategory)}>{Object.entries(categoryLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
          <div className="module-field"><label htmlFor="v7-record-value">Private record content</label><textarea id="v7-record-value" rows={4} maxLength={12000} value={value} onChange={(event) => setValue(event.target.value)} placeholder="Only enter information you actually need to keep. This content is encrypted before local storage." /></div>
          <button className="module-submit" type="button" disabled={loading || !title.trim() || !value.trim()} onClick={() => void addRecord()}>{loading ? "Encrypting and saving…" : "Encrypt and save record"}</button>
        </div>
        <div className="module-record-list">
          {records.length === 0 ? <p className="module-empty">No records saved. Add a record above; it is encrypted before local storage.</p> : records.map((record) => <article className="module-record" key={record.id}>
            <div className="flex items-center justify-between gap-3"><div className="module-record-title">{record.title}</div><button type="button" aria-label={`Delete ${record.title}`} className="rounded-lg border border-rose-300/20 p-2 text-rose-200" onClick={() => void removeRecord(record.id)}><Trash2 size={14} /></button></div>
            <p className="text-xs text-cyan-200">{categoryLabels[record.category]}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{record.value}</p>
            <p className="mt-2 text-[10px] text-slate-500">Created {new Date(record.createdAt).toLocaleString()}</p>
          </article>)}
        </div>
      </section>}

      <section className="module-card">
        <div className="module-card-title"><ShieldCheck size={18} /><h2>Shield 2 · Dignity Shield Protocol</h2></div>
        <p className="offline-drafts-copy">Dignity Shield is Klin&apos;s private financial-assistance and fee-waiver program. A user must never receive a public badge, hardship label or social marker because they requested help. The request, if introduced, must remain private.</p>
        <div className="module-alert module-alert-warning">Not accepting assistance requests yet. Eligibility rules, approvers, funding budget, appeals, expiry and accounting are not finalized. Klin will not invent eligibility or promise a fee waiver before those rules are approved.</div>
      </section>
      <section className="module-card">
        <div className="module-card-title"><ShieldCheck size={18} /><h2>Shield 3 · 21+ Compliance Firewall</h2></div>
        <p className="offline-drafts-copy">Klin&apos;s planned Business Exchange, escrow, valuation and handover features require verified 21+ eligibility. Self-declared age is not proof. Under-21 and unverified accounts must not enter those restricted features.</p>
        <div className="module-alert module-alert-warning">The age-verification provider and verified-age record are not connected yet. Business Exchange remains unavailable until the server can verify age status and the policy receives legal review.</div>
      </section>
    </main>
  );
}
