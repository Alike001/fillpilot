import { describe, expect, it } from "vitest";

import { parseServerEnv, requireDatabaseUrl } from "./env";

describe("server environment", () => {
  it("accepts an empty optional encryption key", () => {
    const env = parseServerEnv({ TOKEN_ENCRYPTION_KEY: "" });

    expect(env.TOKEN_ENCRYPTION_KEY).toBeUndefined();
  });

  it("rejects malformed database URLs", () => {
    expect(() => parseServerEnv({ DATABASE_URL: "not-a-url" })).toThrow();
  });

  it("rejects encryption keys that are not 32 bytes", () => {
    expect(() =>
      parseServerEnv({
        TOKEN_ENCRYPTION_KEY: Buffer.from("too-short").toString("base64"),
      }),
    ).toThrow(/32 bytes/);
  });

  it("fails clearly when a database operation has no URL", () => {
    expect(() => requireDatabaseUrl(parseServerEnv({}))).toThrow(
      /DATABASE_URL/,
    );
  });
});
