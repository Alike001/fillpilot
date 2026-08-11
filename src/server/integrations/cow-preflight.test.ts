import { describe, expect, it } from "vitest";
import type { OrderQuoteResponse } from "@cowprotocol/sdk-order-book";

import {
  getCowPreflight,
  getValidatedCowQuote,
  validateCowPreflight,
} from "./cow-preflight";
import { executionNetwork } from "./execution-network";

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
      validTo: Math.floor(INPUT.deadline.getTime() / 1000),
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
  it("uses a local fake to request only the locked Base PRESIGN quote", async () => {
    let request: unknown;
    const fakeApi = {
      async getQuote(input: unknown) {
        request = input;
        return response();
      },
    };

    await expect(getCowPreflight(INPUT, fakeApi, NOW)).resolves.toMatchObject({
      buyAmount: 4_500_000_000_000_000n,
      verified: true,
    });
    expect(request).toMatchObject({
      kind: "sell",
      sellToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      buyToken: "0x4200000000000000000000000000000000000006",
      sellAmountBeforeFee: "12000000",
      from: INPUT.owner,
      receiver: INPUT.owner,
      signingScheme: "presign",
      priceQuality: "verified",
      validTo: Math.floor(INPUT.deadline.getTime() / 1000),
    });
  });

  it("keeps a local CoW transport failure distinct from a quote decision", async () => {
    const fakeApi = {
      async getQuote() {
        throw new Error("controlled fake outage");
      },
    };

    await expect(getCowPreflight(INPUT, fakeApi, NOW)).rejects.toThrow(
      "controlled fake outage",
    );
  });

  it("uses the Ethereum Sepolia market only when that profile is explicit", async () => {
    const network = executionNetwork("ethereum-sepolia");
    let request: unknown;
    const fakeApi = {
      async getQuote(input: unknown) {
        request = input;
        return response({
          quote: {
            ...response().quote,
            sellToken: network.sellToken,
            buyToken: network.buyToken,
          },
        });
      },
    };

    await expect(
      getCowPreflight(INPUT, fakeApi, NOW, network),
    ).resolves.toMatchObject({
      verified: true,
    });
    expect(request).toMatchObject({
      sellToken: network.sellToken,
      buyToken: network.buyToken,
    });
  });

  it("accepts a fresh verified Base quote that protects the exact floor", () => {
    const preflight = validateCowPreflight(
      response(),
      INPUT,
      Math.floor(INPUT.deadline.getTime() / 1000),
      NOW,
    );

    expect(preflight).toMatchObject({
      buyAmount: 4_500_000_000_000_000n,
      validTo: Math.floor(INPUT.deadline.getTime() / 1000),
      verified: true,
    });
  });

  it("returns the validated raw quote only after applying the same checks", async () => {
    const quote = response();
    await expect(
      getValidatedCowQuote(
        INPUT,
        {
          async getQuote() {
            return quote;
          },
        },
        NOW,
      ),
    ).resolves.toBe(quote);
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
      validateCowPreflight(
        invalidResponse,
        INPUT,
        Math.floor(INPUT.deadline.getTime() / 1000),
        NOW,
      ),
    ).toThrow(expected);
  });
});
