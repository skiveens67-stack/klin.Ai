import "server-only";

import { createCipheriv, randomBytes } from "node:crypto";

export function encryptContactValue(value: string): string {
  const encodedKey = process.env.KLIN_CONTACT_ENCRYPTION_KEY;
  if (!encodedKey) throw new Error("Contact encryption is not configured.");
  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32) throw new Error("Contact encryption key must be 32 bytes.");

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["enc:v1", iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(":");
}
