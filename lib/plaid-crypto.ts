
import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

function encryptionKey(): Buffer {
  const raw = process.env.PLAID_TOKEN_ENCRYPTION_KEY;

  if (!raw || !/^[a-f0-9]{64}$/i.test(raw)) {
    throw new Error(
      "PLAID_TOKEN_ENCRYPTION_KEY must contain 64 hex characters."
    );
  }

  return Buffer.from(raw, "hex");
}

export function encryptPlaidToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    encryptionKey(),
    iv
  );

  const ciphertext = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);

  return [iv, cipher.getAuthTag(), ciphertext]
    .map((part) => part.toString("base64url"))
    .join(".");
}

export function decryptPlaidToken(value: string): string {
  const parts = value.split(".");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token.");
  }

  const [iv, tag, ciphertext] = parts.map((part) =>
    Buffer.from(part, "base64url")
  );

  if (iv.length !== 12 || tag.length !== 16) {
    throw new Error("Invalid encrypted token.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    iv
  );

  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
