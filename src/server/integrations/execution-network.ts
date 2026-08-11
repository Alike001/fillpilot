import {
  COW_PROTOCOL_SETTLEMENT_CONTRACT_ADDRESS,
  SupportedChainId,
  type Address,
} from "@cowprotocol/sdk-config";

export type FillPilotExecutionNetwork = "base-mainnet" | "ethereum-sepolia";

export type ExecutionNetworkProfile = Readonly<{
  id: FillPilotExecutionNetwork;
  chainId: number;
  cowChainId: SupportedChainId;
  settlement: Address;
  label: string;
  isTestnet: boolean;
}>;

const profiles: Record<FillPilotExecutionNetwork, ExecutionNetworkProfile> = {
  "base-mainnet": {
    id: "base-mainnet",
    chainId: SupportedChainId.BASE,
    cowChainId: SupportedChainId.BASE,
    settlement: COW_PROTOCOL_SETTLEMENT_CONTRACT_ADDRESS[
      SupportedChainId.BASE
    ] as Address,
    label: "Base mainnet",
    isTestnet: false,
  },
  "ethereum-sepolia": {
    id: "ethereum-sepolia",
    chainId: SupportedChainId.SEPOLIA,
    cowChainId: SupportedChainId.SEPOLIA,
    settlement: COW_PROTOCOL_SETTLEMENT_CONTRACT_ADDRESS[
      SupportedChainId.SEPOLIA
    ] as Address,
    label: "Ethereum Sepolia",
    isTestnet: true,
  },
};

export function executionNetwork(
  id: FillPilotExecutionNetwork = "base-mainnet",
): ExecutionNetworkProfile {
  return profiles[id];
}
