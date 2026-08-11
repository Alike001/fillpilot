import {
  COW_PROTOCOL_SETTLEMENT_CONTRACT_ADDRESS,
  SupportedChainId,
  type Address,
} from "@cowprotocol/sdk-config";

import { parseServerEnv, type ServerEnv } from "@/env";

export type FillPilotExecutionNetwork = "base-mainnet" | "ethereum-sepolia";

export type ExecutionNetworkProfile = Readonly<{
  id: FillPilotExecutionNetwork;
  chainId: number;
  cowChainId: SupportedChainId;
  cowEnvironment: "prod" | "staging";
  settlement: Address;
  sellToken: Address;
  buyToken: Address;
  sellSymbol: string;
  buySymbol: string;
  sellDecimals: number;
  buyDecimals: number;
  label: string;
  isTestnet: boolean;
}>;

const profiles: Record<FillPilotExecutionNetwork, ExecutionNetworkProfile> = {
  "base-mainnet": {
    id: "base-mainnet",
    chainId: SupportedChainId.BASE,
    cowChainId: SupportedChainId.BASE,
    cowEnvironment: "prod",
    settlement: COW_PROTOCOL_SETTLEMENT_CONTRACT_ADDRESS[
      SupportedChainId.BASE
    ] as Address,
    sellToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address,
    buyToken: "0x4200000000000000000000000000000000000006" as Address,
    sellSymbol: "USDC",
    buySymbol: "WETH",
    sellDecimals: 6,
    buyDecimals: 18,
    label: "Base mainnet",
    isTestnet: false,
  },
  "ethereum-sepolia": {
    id: "ethereum-sepolia",
    chainId: SupportedChainId.SEPOLIA,
    cowChainId: SupportedChainId.SEPOLIA,
    cowEnvironment: "staging",
    settlement: COW_PROTOCOL_SETTLEMENT_CONTRACT_ADDRESS[
      SupportedChainId.SEPOLIA
    ] as Address,
    sellToken: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14" as Address,
    buyToken: "0xbe72E441BF55620febc26715db68d3494213D8Cb" as Address,
    sellSymbol: "WETH",
    buySymbol: "COW",
    sellDecimals: 18,
    buyDecimals: 18,
    label: "Ethereum Sepolia",
    isTestnet: true,
  },
};

export function executionNetwork(
  id: FillPilotExecutionNetwork = "base-mainnet",
): ExecutionNetworkProfile {
  return profiles[id];
}

export function selectedExecutionNetwork(
  env: ServerEnv = parseServerEnv(),
): ExecutionNetworkProfile {
  return executionNetwork(env.EXECUTION_NETWORK);
}

/** Reject a database goal whose immutable market does not match a known profile. */
export function executionNetworkForGoal(input: {
  chainId: number;
  sellToken: string;
  buyToken: string;
}): ExecutionNetworkProfile {
  const profile = Object.values(profiles).find(
    (candidate) =>
      candidate.chainId === input.chainId &&
      candidate.sellToken.toLowerCase() === input.sellToken.toLowerCase() &&
      candidate.buyToken.toLowerCase() === input.buyToken.toLowerCase(),
  );
  if (!profile) {
    throw new Error("Goal execution profile is unsupported or inconsistent.");
  }
  return profile;
}
