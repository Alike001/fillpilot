import { encodeFunctionData, type Address } from "viem";

import type {
  KeeperHubSimulator,
  SimulationRequest,
  SimulationResult,
} from "./keeperhub-simulation";

const PRESIGN_ABI = [
  {
    type: "function",
    name: "setPreSignature",
    stateMutability: "nonpayable",
    inputs: [
      { name: "orderUid", type: "bytes" },
      { name: "signed", type: "bool" },
    ],
    outputs: [],
  },
] as const;

type FetchLike = typeof fetch;

type KeeperHubSimulationResponse = {
  readonly success?: boolean;
  readonly status?: string;
  readonly gasEstimate?: string;
  readonly wouldRevert?: boolean;
  readonly revertReason?: string;
  readonly error?: string;
};

/**
 * A strictly simulation-only KeeperHub adapter. It never accepts an execution
 * flag and always sends `simulate: true` in the JSON request body.
 */
export class KeeperHubDirectSimulator implements KeeperHubSimulator {
  constructor(
    private readonly options: {
      readonly apiKey: string;
      readonly baseUrl?: string;
      readonly fetcher?: FetchLike;
    },
  ) {}

  async simulate(request: SimulationRequest): Promise<SimulationResult> {
    const expectedCalldata = encodeFunctionData({
      abi: PRESIGN_ABI,
      functionName: "setPreSignature",
      args: [request.orderUid, true],
    });
    if (request.data.toLowerCase() !== expectedCalldata.toLowerCase()) {
      throw new Error("Simulation calldata does not match CoW setPreSignature");
    }

    const response = await (this.options.fetcher ?? fetch)(
      `${this.options.baseUrl ?? "https://app.keeperhub.com"}/api/execute/contract-call`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contractAddress: request.to,
          chainId: 8453,
          functionName: "setPreSignature",
          functionArgs: JSON.stringify([request.orderUid, true]),
          abi: JSON.stringify(PRESIGN_ABI),
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
          `KeeperHub simulation failed with HTTP ${response.status}`,
      };
    }
    if (payload.status !== "simulated" || !payload.gasEstimate) {
      throw new Error("KeeperHub returned an invalid simulation response");
    }

    return { status: "simulated", gasEstimate: BigInt(payload.gasEstimate) };
  }
}

export const cowPresignAbi = PRESIGN_ABI;
