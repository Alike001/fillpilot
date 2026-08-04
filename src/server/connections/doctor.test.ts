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
    });
  });
});
