export type KlinVaultCategory = "identity" | "biometric_pose" | "voice_print" | "gps" | "private_note";
export type KlinVaultRecord = {
  id: string;
  title: string;
  category: KlinVaultCategory;
  value: string;
  createdAt: string;
};
export type KlinVaultEnvelope = {
  format: "klin-v7-vault";
  version: 1;
  cipher: "AES-256-GCM";
  kdf: "PBKDF2-SHA-256";
  iterations: 600000;
  salt: string;
  iv: string;
  ciphertext: string;
};

const ITERATIONS = 600_000;

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function isVaultRecord(value: unknown): value is KlinVaultRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" && typeof record.title === "string" &&
    ["identity", "biometric_pose", "voice_print", "gps", "private_note"].includes(String(record.category)) &&
    typeof record.value === "string" && typeof record.createdAt === "string";
}

function isVaultEnvelope(value: unknown): value is KlinVaultEnvelope {
  if (!value || typeof value !== "object") return false;
  const envelope = value as Record<string, unknown>;
  return envelope.format === "klin-v7-vault" && envelope.version === 1 &&
    envelope.cipher === "AES-256-GCM" && envelope.kdf === "PBKDF2-SHA-256" &&
    envelope.iterations === ITERATIONS && typeof envelope.salt === "string" &&
    typeof envelope.iv === "string" && typeof envelope.ciphertext === "string";
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", toArrayBuffer(new TextEncoder().encode(passphrase)), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: toArrayBuffer(salt), iterations: ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptKlinVault(records: KlinVaultRecord[], passphrase: string): Promise<KlinVaultEnvelope> {
  if (passphrase.length < 12 || passphrase.length > 256) throw new Error("Use a vault passphrase between 12 and 256 characters.");
  if (!Array.isArray(records) || records.length > 500 || !records.every(isVaultRecord)) throw new Error("Vault record data is invalid.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const plaintext = new TextEncoder().encode(JSON.stringify(records));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: toArrayBuffer(iv) }, key, toArrayBuffer(plaintext));
  return {
    format: "klin-v7-vault",
    version: 1,
    cipher: "AES-256-GCM",
    kdf: "PBKDF2-SHA-256",
    iterations: ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  };
}

export async function decryptKlinVault(envelopeValue: unknown, passphrase: string): Promise<KlinVaultRecord[]> {
  if (!isVaultEnvelope(envelopeValue)) throw new Error("This is not a supported Klin V7 vault file.");
  if (passphrase.length < 12 || passphrase.length > 256) throw new Error("Enter the vault passphrase.");
  try {
    const salt = fromBase64(envelopeValue.salt);
    const iv = fromBase64(envelopeValue.iv);
    const ciphertext = fromBase64(envelopeValue.ciphertext);
    if (salt.length !== 16 || iv.length !== 12 || ciphertext.length > 5_000_000) throw new Error("Invalid vault payload.");
    const key = await deriveKey(passphrase, salt);
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: toArrayBuffer(iv) }, key, toArrayBuffer(ciphertext));
    const records: unknown = JSON.parse(new TextDecoder().decode(plaintext));
    if (!Array.isArray(records) || records.length > 500 || !records.every(isVaultRecord)) throw new Error("Invalid vault records.");
    return records;
  } catch {
    throw new Error("The passphrase is incorrect or the vault file is damaged.");
  }
}

export function isKlinVaultEnvelope(value: unknown): value is KlinVaultEnvelope {
  return isVaultEnvelope(value);
}
