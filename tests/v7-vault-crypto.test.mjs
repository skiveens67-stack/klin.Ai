import assert from "node:assert/strict";
import { test } from "node:test";
import { decryptKlinVault, encryptKlinVault } from "../lib/v7-vault-crypto.ts";

test("Klin V7 vault encrypts records and decrypts them with the correct passphrase", async () => {
  const records = [{
    id: "record-1",
    title: "Private test record",
    category: "private_note",
    value: "This text must only appear inside authenticated encryption.",
    createdAt: "2026-11-20T12:00:00.000Z",
  }];
  const envelope = await encryptKlinVault(records, "a-long-test-passphrase-2026");
  assert.equal(envelope.format, "klin-v7-vault");
  assert.equal(envelope.cipher, "AES-256-GCM");
  assert.notEqual(envelope.ciphertext, Buffer.from(JSON.stringify(records)).toString("base64"));
  assert.deepEqual(await decryptKlinVault(envelope, "a-long-test-passphrase-2026"), records);
});

test("Klin V7 vault rejects an incorrect passphrase", async () => {
  const envelope = await encryptKlinVault([], "a-long-test-passphrase-2026");
  await assert.rejects(() => decryptKlinVault(envelope, "incorrect-long-passphrase"), /incorrect or the vault file is damaged/);
});

test("Klin V7 vault requires a strong passphrase", async () => {
  await assert.rejects(() => encryptKlinVault([], "short"), /at least 12 characters/);
});
