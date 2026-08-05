import { describe, expect, it } from "vitest";
import type { OrderQuoteResponse } from "@cowprotocol/sdk-order-book";

import { validateCowPreflight } from "./cow-preflight";

const NOW = new Date("2026-08-05T12:00:00.000Z");
const INPUT = {
  owner: "0x1111111111111111111111111111111111111111",
  sellAmount: 12_000_000n,
  minimumBuyAmount: 4_000_000_000_000_000n,
  deadline: new Date("2026-08-05T13:00:00.000Z"),
} as const;

function response(overrides: Record<string, unknown> = {}): OrderQuoteResponse {
  return {
    quote: {
      sellToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      buyToken: "0x4200000000000000000000000000000000000006",
      sellAmount: "11900000",
      buyAmount: "4500000000000000",
      feeAmount: "100000",
      validTo: 1_770_300_000,
      appData: "{}",
      kind: "sell",
      partiallyFillable: false,
    },
    from: INPUT.owner,
    expiration: "2026-08-05T12:05:00.000Z",
    verified: true,
    ...overrides,
  } as OrderQuoteResponse;
}

describe("CoW preflight", () => {
  it("accepts a fresh verified Base quote that protects the exact floor", () => {
    const preflight = validateCowPreflight(
      response(),
      INPUT,
      1_770_300_000,
      NOW,
    );

    expect(preflight).toMatchObject({
      buyAmount: 4_500_000_000_000_000n,
      validTo: 1_770_300_000,
      verified: true,
    });
  });

  it.each([
    ["unverified", response({ verified: false }), "quote-unverified"],
    [
      "expired",
      response({ expiration: "2026-08-05T11:59:59.000Z" }),
      "quote-malformed",
    ],
    [
      "below the floor",
      response({
        quote: { ...response().quote, buyAmount: "3999999999999999" },
      }),
      "quote-below-floor",
    ],
    [
      "wrong token",
      response({ quote: { ...response().quote, buyToken: INPUT.owner } }),
      "quote-malformed",
    ],
  ])("rejects a %s quote", (_label, invalidResponse, expected) => {
    expect(() =>
      validateCowPreflight(invalidResponse, INPUT, 1_770_300_000, NOW),
    ).toThrow(expected);
  });
});
