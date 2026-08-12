import { keccak256, parseAbi } from "viem";

export const PUBLIC_BASE_SEPOLIA_EXECUTION_CANARY = {
  chainId: 84532,
  contract: "0x2A6FC8182Bf9928Ef7517dA980dC79e8107c555A" as const,
  runtimeCodeHash:
    "0x753157870ee9e692c7e35e0890fad801fd30fc4674a74a62a7526758da649dd0" as const,
  functionName: "ping",
  abi: parseAbi(["function ping(bytes32 challenge)"]),
  sourceRepository: "https://github.com/winsznx/keeperhub-flightcheck",
} as const;

const baseSepoliaRpcUrl = "https://sepolia.base.org";

type FetchLike = typeof fetch;

type RpcResponse = {
  readonly result?: string;
  readonly error?: { readonly message?: string };
};

export type PublicExecutionCanaryCheck =
  | {
      readonly status: "verified-external-canary";
      readonly observedCodeHash: string;
    }
  | {
      readonly status: "unavailable-external-canary";
      readonly reason: string;
    };

/**
 * Confirms that the public canary has the pinned runtime code before it is
 * ever offered as a KeeperHub execution proof. This is a chain read only.
 */
export async function verifyPublicExecutionCanary(
  fetcher: FetchLike = fetch,
): Promise<PublicExecutionCanaryCheck> {
  try {
    const response = await fetcher(baseSepoliaRpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "fillpilot-public-canary-check",
        method: "eth_getCode",
        params: [PUBLIC_BASE_SEPOLIA_EXECUTION_CANARY.contract, "latest"],
      }),
    });
    const payload = (await response.json()) as RpcResponse;
    if (!response.ok || !payload.result || payload.result === "0x") {
      return {
        status: "unavailable-external-canary",
        reason:
          payload.error?.message ??
          `Base Sepolia canary code read failed with HTTP ${response.status}.`,
      };
    }
    const observedCodeHash = keccak256(payload.result as `0x${string}`);
    if (
      observedCodeHash.toLowerCase() !==
      PUBLIC_BASE_SEPOLIA_EXECUTION_CANARY.runtimeCodeHash.toLowerCase()
    ) {
      return {
        status: "unavailable-external-canary",
        reason:
          "The public canary code hash no longer matches the pinned review hash.",
      };
    }
    return { status: "verified-external-canary", observedCodeHash };
  } catch (error) {
    return {
      status: "unavailable-external-canary",
      reason:
        error instanceof Error
          ? `Base Sepolia canary code read is unavailable: ${error.message}`
          : "Base Sepolia canary code read is unavailable.",
    };
  }
}
