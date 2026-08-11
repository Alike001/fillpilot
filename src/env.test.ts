import { describe, expect, it } from "vitest";

import {
  parseServerEnv,
  requireDatabaseUrl,
  requireKeeperHubApiKey,
  requireEthereumSepoliaReadReady,
  requireEthereumSepoliaTestnetWriteReady,
  requireMainnetWritesEnabled,
} from "./env";

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

  it("accepts a KeeperHub API key only in server configuration", () => {
    const env = parseServerEnv({ KEEPERHUB_API_KEY: "kh_test_123" });

    expect(requireKeeperHubApiKey(env)).toBe("kh_test_123");
    expect(() => parseServerEnv({ KEEPERHUB_API_KEY: "not-a-key" })).toThrow(
      /must start with kh_/,
    );
    expect(() => requireKeeperHubApiKey(parseServerEnv({}))).toThrow(
      /KEEPERHUB_API_KEY/,
    );
  });

  it("keeps mainnet writes disabled unless the exact server flag is set", () => {
    expect(() => requireMainnetWritesEnabled(parseServerEnv({}))).toThrow(
      "Mainnet writes are disabled",
    );
    expect(() =>
      requireMainnetWritesEnabled(
        parseServerEnv({ ENABLE_MAINNET_WRITES: "true" }),
      ),
    ).not.toThrow();
  });

  it("requires a separate Sepolia network, RPC, and write flag", () => {
    const base = parseServerEnv({});
    expect(() => requireEthereumSepoliaReadReady(base)).toThrow(
      "not the selected",
    );

    const selected = parseServerEnv({ EXECUTION_NETWORK: "ethereum-sepolia" });
    expect(() => requireEthereumSepoliaReadReady(selected)).toThrow(
      "SEPOLIA_RPC_URL",
    );

    const readable = parseServerEnv({
      EXECUTION_NETWORK: "ethereum-sepolia",
      SEPOLIA_RPC_URL: "https://sepolia.example.test",
    });
    expect(requireEthereumSepoliaReadReady(readable)).toBe(
      "https://sepolia.example.test",
    );
    expect(() => requireEthereumSepoliaTestnetWriteReady(readable)).toThrow(
      "Testnet writes are disabled",
    );

    expect(
      requireEthereumSepoliaTestnetWriteReady(
        parseServerEnv({
          EXECUTION_NETWORK: "ethereum-sepolia",
          SEPOLIA_RPC_URL: "https://sepolia.example.test",
          ENABLE_TESTNET_WRITES: "true",
        }),
      ),
    ).toBe("https://sepolia.example.test");
  });
});
