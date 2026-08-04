import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

function encryptionKey(source = process.env.TOKEN_ENCRYPTION_KEY): Buffer {
  if (!source) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY is required to store OAuth credentials",
    );
  }

  const key = Buffer.from(source, "base64");
  if (key.byteLength !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes");
  }

  return key;
}

export function encryptSecret(
  plaintext: string,
  key = encryptionKey(),
): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, ciphertext]).toString("base64url");
}

export function decryptSecret(payload: string, key = encryptionKey()): string {
  const data = Buffer.from(payload, "base64url");
  if (data.byteLength <= IV_BYTES + TAG_BYTES) {
    throw new Error("Encrypted credential payload is malformed");
  }

  const iv = data.subarray(0, IV_BYTES);
  const tag = data.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = data.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
