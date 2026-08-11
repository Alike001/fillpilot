import { describe, expect, it } from "vitest";

import { executionNetwork } from "./execution-network";
import { buildTestnetCanaryReview } from "./testnet-canary-review";

const UID = `0x${"ab".repeat(56)}` as const;

describe("testnet canary review", () => {
  it("prepares only the exact Ethereum Sepolia CoW authorization call", () => {
    const network = executionNetwork("ethereum-sepolia");
    const review = buildTestnetCanaryReview("goal-1", {
      order: {} as never,
      owner: "0x1111111111111111111111111111111111111111",
      settlement: network.settlement,
      uid: UID,
    });

    expect(review).toMatchObject({
      status: "prepared-for-operator-review",
      network: "Ethereum Sepolia",
      chainId: 11155111,
      contractAddress: network.settlement,
      functionName: "setPreSignature",
      functionArgs: [UID, true],
      valueWei: "0",
      submitPolicy: "requires-separate-explicit-approval",
    });
    expect(review.calldata).not.toBe("0x");
    expect(review.idempotencyKey).toBe(`testnet-canary:goal-1:${UID}`);
  });

  it("requires a goal ID before an operator review can be prepared", () => {
    const network = executionNetwork("ethereum-sepolia");
    expect(() =>
      buildTestnetCanaryReview("", {
        order: {} as never,
        owner: "0x1111111111111111111111111111111111111111",
        settlement: network.settlement,
        uid: UID,
      }),
    ).toThrow("goal ID is required");
  });
});
