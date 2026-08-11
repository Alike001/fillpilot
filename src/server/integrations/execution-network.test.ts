import { describe, expect, it } from "vitest";
import { SupportedChainId } from "@cowprotocol/sdk-config";

import {
  executionNetwork,
  executionNetworkForGoal,
  selectedExecutionNetwork,
} from "./execution-network";

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

  it("recovers the immutable Sepolia market from a saved goal", () => {
    const sepolia = executionNetwork("ethereum-sepolia");
    expect(
      executionNetworkForGoal({
        chainId: sepolia.chainId,
        sellToken: sepolia.sellToken.toLowerCase(),
        buyToken: sepolia.buyToken.toUpperCase(),
      }),
    ).toBe(sepolia);
  });

  it("rejects a goal whose chain and token pair disagree", () => {
    const base = executionNetwork();
    const sepolia = executionNetwork("ethereum-sepolia");
    expect(() =>
      executionNetworkForGoal({
        chainId: base.chainId,
        sellToken: sepolia.sellToken,
        buyToken: sepolia.buyToken,
      }),
    ).toThrow("unsupported or inconsistent");
  });

  it("selects the configured network only when a new goal is created", () => {
    expect(
      selectedExecutionNetwork({
        NODE_ENV: "development",
        APP_URL: "http://127.0.0.1:3000",
        KEEPERHUB_MCP_URL: "https://app.keeperhub.com/mcp",
        EXECUTION_NETWORK: "ethereum-sepolia",
        ENABLE_MAINNET_WRITES: false,
        ENABLE_TESTNET_WRITES: false,
      }),
    ).toBe(executionNetwork("ethereum-sepolia"));
  });
});
