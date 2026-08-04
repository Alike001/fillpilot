import { randomBytes } from "node:crypto";

import { describe, expect, it } from "vitest";

import { decryptSecret, encryptSecret } from "./crypto";

describe("credential encryption", () => {
  const key = randomBytes(32);

  it("round trips secrets without storing plaintext", () => {
    const encrypted = encryptSecret("refresh-token-value", key);

    expect(encrypted).not.toContain("refresh-token-value");
    expect(decryptSecret(encrypted, key)).toBe("refresh-token-value");
  });

  it("rejects tampered ciphertext", () => {
    const encrypted = encryptSecret("refresh-token-value", key);
    const raw = Buffer.from(encrypted, "base64url");
    raw[raw.length - 1] ^= 1;

    expect(() => decryptSecret(raw.toString("base64url"), key)).toThrow();
  });
});
