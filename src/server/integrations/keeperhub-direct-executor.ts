import { encodeFunctionData } from "viem";

import { cowPresignAbi } from "./keeperhub-direct-simulator";
import type { SimulationRequest } from "./keeperhub-simulation";

type FetchLike = typeof fetch;

type KeeperHubExecutionResponse = {
  readonly executionId?: string;
  readonly status?: string;
  readonly success?: boolean;
  readonly error?: string;
  readonly idempotentReplay?: boolean;
};

export type SubmittedPresignature = {
  readonly executionId: string;
  readonly idempotentReplay: boolean;
  readonly status: string;
};

/**
 * The only direct-write adapter for the initial CoW authorization. Callers
 * must pass a server-side approval gate; this adapter sends no request when
 * the gate is off and is never exposed directly to the browser.
 */
export class KeeperHubDirectExecutor {
  constructor(
    private readonly options: {
      readonly apiKey: string;
      readonly writesEnabled: boolean;
      readonly baseUrl?: string;
      readonly fetcher?: FetchLike;
    },
  ) {}

  async submitPresignature(
    request: SimulationRequest,
    idempotencyKey: string,
  ): Promise<SubmittedPresignature> {
    if (!this.options.writesEnabled) {
      throw new Error("Mainnet writes are disabled by server policy");
    }
    if (!idempotencyKey.trim()) {
      throw new Error("An idempotency key is required for a mainnet write");
    }
    const expectedCalldata = encodeFunctionData({
      abi: cowPresignAbi,
      functionName: "setPreSignature",
      args: [request.orderUid, true],
    });
    if (request.data.toLowerCase() !== expectedCalldata.toLowerCase()) {
      throw new Error("Execution calldata does not match CoW setPreSignature");
    }

    const response = await (this.options.fetcher ?? fetch)(
      `${this.options.baseUrl ?? "https://app.keeperhub.com"}/api/execute/contract-call`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          contractAddress: request.to,
          chainId: request.chainId,
          functionName: "setPreSignature",
          functionArgs: JSON.stringify([request.orderUid, true]),
          abi: JSON.stringify(cowPresignAbi),
        }),
      },
    );
    const payload = (await response.json()) as KeeperHubExecutionResponse;
    if (!response.ok || payload.success === false || !payload.executionId) {
      throw new Error(
        payload.error ??
          `KeeperHub execution failed with HTTP ${response.status}`,
      );
    }
    return {
      executionId: payload.executionId,
      idempotentReplay: payload.idempotentReplay === true,
      status: payload.status ?? "submitted",
    };
  }
}
