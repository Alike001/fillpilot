import { describe, expect, it } from "vitest";

import { buildConnectionDoctor } from "./doctor";

describe("connection doctor", () => {
  it("keeps chain and funds checks unavailable before a connection exists", () => {
    const checks = buildConnectionDoctor({ connection: "disconnected" });

    expect(checks.map((check) => check.state)).toEqual([
      "attention",
      "unavailable",
      "unavailable",
      "unavailable",
      "unavailable",
      "unavailable",
    ]);
  });

  it("explains a missing browser session without exposing credentials", () => {
    const checks = buildConnectionDoctor({
      connection: "disconnected",
      connectionIssue: "missing-session",
    });

    expect(checks.find((check) => check.id === "connection")).toMatchObject({
      detail:
        "Browser session is missing. Use the same local hostname used to connect.",
    });
  });

  it("flags a connected organization on the wrong chain", () => {
    const checks = buildConnectionDoctor({
      connection: "connected",
      walletAddress: "0x1111111111111111111111111111111111111111",
      chainId: 1,
    });

    expect(checks.find((check) => check.id === "chain")).toMatchObject({
      state: "attention",
    });
    expect(checks.find((check) => check.id === "gas")).toMatchObject({
      state: "unavailable",
    });
  });

  it("requires enough gas, USDC, and allowance for the selected fill", () => {
    const checks = buildConnectionDoctor({
      connection: "connected",
      walletAddress: "0x1111111111111111111111111111111111111111",
      chainId: 8453,
      nativeGasWei: 100_000_000_000_000n,
      usdcBalance: 50_000_000n,
      allowance: 20_000_000n,
      requiredSellAmount: 50_000_000n,
    });

    expect(checks.find((check) => check.id === "gas")).toMatchObject({
      state: "ready",
    });
    expect(checks.find((check) => check.id === "usdc")).toMatchObject({
      state: "ready",
    });
    expect(checks.find((check) => check.id === "allowance")).toMatchObject({
      state: "attention",
      detail: "Below the amount needed for the selected goal.",
    });
  });

  it("explains when the organization wallet has no USDC or CoW allowance", () => {
    const checks = buildConnectionDoctor({
      connection: "connected",
      walletAddress: "0x1111111111111111111111111111111111111111",
      chainId: 8453,
      nativeGasWei: 100_000_000_000_000n,
      usdcBalance: 0n,
      allowance: 0n,
    });

    expect(checks.find((check) => check.id === "usdc")).toMatchObject({
      state: "attention",
      detail: "No sell token is available in the organization wallet.",
    });
    expect(checks.find((check) => check.id === "allowance")).toMatchObject({
      state: "attention",
      detail: "No sell-token allowance for CoW is available yet.",
    });
  });

  it("keeps the connection visible when a Base read fails", () => {
    const checks = buildConnectionDoctor({
      connection: "connected",
      walletAddress: "0x1111111111111111111111111111111111111111",
      chainId: 8453,
      baseReadUnavailable: true,
    });

    expect(checks.find((check) => check.id === "connection")).toMatchObject({
      state: "ready",
    });
    expect(checks.find((check) => check.id === "gas")).toMatchObject({
      state: "attention",
      detail:
        "Network read is temporarily unavailable. KeeperHub remains connected.",
    });
  });

  it("labels an Ethereum Sepolia WETH-to-COW readiness check accurately", () => {
    const checks = buildConnectionDoctor({
      connection: "connected",
      walletAddress: "0x1111111111111111111111111111111111111111",
      chainId: 11155111,
      execution: {
        chainId: 11155111,
        label: "Ethereum Sepolia",
        sellSymbol: "WETH",
      },
      nativeGasWei: 50_000_000_000_000_000n,
      usdcBalance: 0n,
      allowance: 0n,
    });

    expect(checks.find((check) => check.id === "chain")).toMatchObject({
      label: "Ethereum Sepolia",
      state: "ready",
    });
    expect(checks.find((check) => check.id === "usdc")).toMatchObject({
      label: "WETH balance",
    });
    expect(checks.find((check) => check.id === "allowance")).toMatchObject({
      label: "CoW WETH allowance",
    });
  });
});
