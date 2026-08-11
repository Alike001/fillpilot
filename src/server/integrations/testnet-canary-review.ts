import type { Address } from "@cowprotocol/sdk-config";

import { buildPresignSimulationRequest } from "./cow-presign-simulation";
import type { PresignOrder } from "./cow-order";
import { executionNetwork } from "./execution-network";

export type TestnetCanaryReview = Readonly<{
  status: "prepared-for-operator-review";
  network: "Ethereum Sepolia";
  chainId: 11155111;
  goalId: string;
  orderUid: `0x${string}`;
  contractAddress: Address;
  functionName: "setPreSignature";
  functionArgs: readonly [`0x${string}`, true];
  calldata: `0x${string}`;
  valueWei: "0";
  simulatedGasEstimate: string;
  idempotencyKey: string;
  submitPolicy: "requires-separate-explicit-approval";
}>;

/**
 * Turns a verified Sepolia CoW order into the exact KeeperHub call an
 * operator must review. It is a pure representation: no quote, RPC,
 * KeeperHub, signature, or transaction is created here.
 */
export function buildTestnetCanaryReview(
  goalId: string,
  order: PresignOrder,
  simulatedGasEstimate = "not-recorded",
): TestnetCanaryReview {
  if (!goalId.trim()) {
    throw new Error("A goal ID is required to prepare a testnet canary");
  }

  const network = executionNetwork("ethereum-sepolia");
  const request = buildPresignSimulationRequest(goalId, order, network);
  return {
    status: "prepared-for-operator-review",
    network: "Ethereum Sepolia",
    chainId: 11155111,
    goalId,
    orderUid: request.orderUid,
    contractAddress: request.to as Address,
    functionName: "setPreSignature",
    functionArgs: [request.orderUid, true],
    calldata: request.data,
    valueWei: "0",
    simulatedGasEstimate,
    idempotencyKey: `testnet-canary:${goalId}:${request.orderUid}`,
    submitPolicy: "requires-separate-explicit-approval",
  };
}

export function buildTestnetCanaryReviewFromEvidence(input: {
  goalId: string;
  chainId: number;
  simulation: unknown;
}): TestnetCanaryReview {
  const network = executionNetwork("ethereum-sepolia");
  if (input.chainId !== network.chainId) {
    throw new Error("Testnet canary review requires Ethereum Sepolia evidence");
  }
  if (!isSuccessfulPresignSimulation(input.simulation)) {
    throw new Error(
      "Testnet canary review requires a successful stored simulation",
    );
  }

  return buildTestnetCanaryReview(
    input.goalId,
    {
      order: {} as never,
      owner: "0x0000000000000000000000000000000000000000",
      settlement: network.settlement,
      uid: input.simulation.orderUid,
    },
    input.simulation.gasEstimate,
  );
}

function isSuccessfulPresignSimulation(simulation: unknown): simulation is {
  status: "simulated";
  orderUid: `0x${string}`;
  gasEstimate: string;
} {
  if (!simulation || typeof simulation !== "object") return false;
  const value = simulation as Record<string, unknown>;
  return (
    value.status === "simulated" &&
    typeof value.gasEstimate === "string" &&
    /^0x[a-fA-F0-9]{112}$/.test(String(value.orderUid))
  );
}
