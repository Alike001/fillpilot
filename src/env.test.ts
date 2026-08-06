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

  it("uses the isolated test database instead of DATABASE_URL", () => {
    expect(
      requireDatabaseUrl(
        parseServerEnv({
          NODE_ENV: "test",
          DATABASE_URL: "postgres://app:app@127.0.0.1:5432/fillpilot",
          TEST_DATABASE_URL: "postgres://app:app@127.0.0.1:5432/fillpilot_test",
        }),
      ),
    ).toBe("postgres://app:app@127.0.0.1:5432/fillpilot_test");
  });

  it("refuses to use the development database in test mode", () => {
    expect(() =>
      requireDatabaseUrl(
        parseServerEnv({
          NODE_ENV: "test",
          DATABASE_URL: "postgres://app:app@127.0.0.1:5432/fillpilot",
        }),
      ),
    ).toThrow(/TEST_DATABASE_URL/);
  });
});
