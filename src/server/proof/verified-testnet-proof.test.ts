import { describe, expect, it } from "vitest";

import { VERIFIED_TESTNET_PROOF } from "./verified-testnet-proof";

describe("VERIFIED_TESTNET_PROOF", () => {
  it("pins the verified Base Sepolia transaction evidence", () => {
    expect(VERIFIED_TESTNET_PROOF).toMatchObject({
      id: "base-sepolia-canary-20260812",
      chainId: 84532,
      receiptStatus: "Succeeded",
      value: "0 ETH",
    });
    expect(VERIFIED_TESTNET_PROOF.transactionHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(VERIFIED_TESTNET_PROOF.transactionLink).toContain(
      VERIFIED_TESTNET_PROOF.transactionHash,
    );
  });
});
