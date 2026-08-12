import { createHash } from "node:crypto";
import { encodeFunctionData, keccak256, parseAbi } from "viem";

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

type KeeperHubSimulationResponse = {
  readonly success?: boolean;
  readonly status?: string;
  readonly gasEstimate?: string;
  readonly wouldRevert?: boolean;
  readonly revertReason?: string;
  readonly error?: string;
};

type KeeperHubExecutionResponse = {
  readonly executionId?: string;
  readonly status?: string;
  readonly success?: boolean;
  readonly error?: string;
  readonly idempotentReplay?: boolean;
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

export type PublicExecutionCanaryReview = Readonly<{
  chainId: number;
  contract: `0x${string}`;
  function: "ping(bytes32)";
  calldata: `0x${string}`;
  challenge: `0x${string}`;
  value: "0";
  expectedEvent: "Flightcheck(address indexed sender, bytes32 indexed challenge, uint256 chainId)";
  sourceRepository: string;
  boundary: string;
}>;

export type PublicExecutionCanarySimulation =
  | { readonly status: "simulated"; readonly gasEstimate: bigint }
  | { readonly status: "rejected"; readonly reason: string };

export type PublicExecutionCanarySubmission = Readonly<{
  executionId: string;
  status: string;
  idempotentReplay: boolean;
}>;

export const PUBLIC_EXECUTION_CANARY_IDEMPOTENCY_KEY =
  "fillpilot:public-base-sepolia-canary:v1";

/**
 * Builds a stable, human-reviewable zero-value call. It prepares bytes only,
 * does not hold a signing key, and does not contact KeeperHub or a chain.
 */
export function buildPublicExecutionCanaryReview(): PublicExecutionCanaryReview {
  const challenge = `0x${createHash("sha256")
    .update("fillpilot:public-base-sepolia-canary:v1")
    .digest("hex")}` as `0x${string}`;
  return {
    chainId: PUBLIC_BASE_SEPOLIA_EXECUTION_CANARY.chainId,
    contract: PUBLIC_BASE_SEPOLIA_EXECUTION_CANARY.contract,
    function: "ping(bytes32)",
    calldata: encodeFunctionData({
      abi: PUBLIC_BASE_SEPOLIA_EXECUTION_CANARY.abi,
      functionName: "ping",
      args: [challenge],
    }),
    challenge,
    value: "0",
    expectedEvent:
      "Flightcheck(address indexed sender, bytes32 indexed challenge, uint256 chainId)",
    sourceRepository: PUBLIC_BASE_SEPOLIA_EXECUTION_CANARY.sourceRepository,
    boundary:
      "Review only. This prepares a zero-value public-canary ping. It cannot submit, approve tokens, place a CoW order, deploy a contract, or authorize a transaction.",
  };
}

/**
 * Uses KeeperHub's simulation mode for the reviewed bytes only. There is no
 * execution flag and this function cannot broadcast a transaction.
 */
export async function simulatePublicExecutionCanary(
  apiKey: string,
  fetcher: FetchLike = fetch,
): Promise<PublicExecutionCanarySimulation> {
  const review = buildPublicExecutionCanaryReview();
  const response = await fetcher(
    "https://app.keeperhub.com/api/execute/contract-call",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contractAddress: review.contract,
        chainId: review.chainId,
        functionName: PUBLIC_BASE_SEPOLIA_EXECUTION_CANARY.functionName,
        functionArgs: JSON.stringify([review.challenge]),
        abi: JSON.stringify(PUBLIC_BASE_SEPOLIA_EXECUTION_CANARY.abi),
        simulate: true,
      }),
    },
  );
  const payload = (await response.json()) as KeeperHubSimulationResponse;
  if (!response.ok || payload.success === false || payload.wouldRevert) {
    return {
      status: "rejected",
      reason:
        payload.revertReason ??
        payload.error ??
        `KeeperHub simulation failed with HTTP ${response.status}.`,
    };
  }
  if (payload.status !== "simulated" || !payload.gasEstimate) {
    throw new Error(
      "KeeperHub returned an invalid public-canary simulation response.",
    );
  }
  return { status: "simulated", gasEstimate: BigInt(payload.gasEstimate) };
}

/**
 * The sole public-canary write adapter. It has no configurable destination,
 * transfers zero ETH, and refuses to run until the server testnet gate is on.
 */
export async function submitPublicExecutionCanary(
  apiKey: string,
  writesEnabled: boolean,
  fetcher: FetchLike = fetch,
): Promise<PublicExecutionCanarySubmission> {
  if (!writesEnabled) {
    throw new Error(
      "Testnet writes are disabled. Set ENABLE_TESTNET_WRITES=true only after explicit operator approval.",
    );
  }
  const review = buildPublicExecutionCanaryReview();
  const response = await fetcher(
    "https://app.keeperhub.com/api/execute/contract-call",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": PUBLIC_EXECUTION_CANARY_IDEMPOTENCY_KEY,
      },
      body: JSON.stringify({
        contractAddress: review.contract,
        chainId: review.chainId,
        functionName: PUBLIC_BASE_SEPOLIA_EXECUTION_CANARY.functionName,
        functionArgs: JSON.stringify([review.challenge]),
        abi: JSON.stringify(PUBLIC_BASE_SEPOLIA_EXECUTION_CANARY.abi),
      }),
    },
  );
  const payload = (await response.json()) as KeeperHubExecutionResponse;
  if (!response.ok || payload.success === false || !payload.executionId) {
    throw new Error(
      payload.error ??
        `KeeperHub execution failed with HTTP ${response.status}.`,
    );
  }
  return {
    executionId: payload.executionId,
    status: payload.status ?? "submitted",
    idempotentReplay: payload.idempotentReplay === true,
  };
}

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
