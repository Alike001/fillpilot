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
    idempotencyKey: `testnet-canary:${goalId}:${request.orderUid}`,
    submitPolicy: "requires-separate-explicit-approval",
  };
}
