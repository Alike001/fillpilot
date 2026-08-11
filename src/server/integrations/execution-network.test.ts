import { describe, expect, it } from "vitest";
import { SupportedChainId } from "@cowprotocol/sdk-config";

import { executionNetwork } from "./execution-network";

describe("FillPilot execution networks", () => {
  it("keeps the product default on Base mainnet", () => {
    const profile = executionNetwork();
    expect(profile).toMatchObject({
      id: "base-mainnet",
      chainId: SupportedChainId.BASE,
      isTestnet: false,
    });
  });

  it("uses Ethereum Sepolia for CoW testnet execution", () => {
    const profile = executionNetwork("ethereum-sepolia");
    expect(profile).toMatchObject({
      chainId: SupportedChainId.SEPOLIA,
      cowChainId: SupportedChainId.SEPOLIA,
      isTestnet: true,
    });
    expect(profile.settlement).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });
});
