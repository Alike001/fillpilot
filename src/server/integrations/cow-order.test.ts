import { describe, expect, it } from "vitest";
import type { OrderQuoteResponse } from "@cowprotocol/sdk-order-book";

import { buildPresignOrder } from "./cow-order";

const NOW = new Date("2026-08-05T12:00:00.000Z");
const INPUT = {
  owner: "0x1111111111111111111111111111111111111111",
  sellAmount: 12_000_000n,
  minimumBuyAmount: 4_000_000_000_000_000n,
  deadline: new Date("2026-08-05T13:00:00.000Z"),
} as const;

function quote(overrides: Partial<OrderQuoteResponse["quote"]> = {}) {
  return {
    quote: {
      sellToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      buyToken: "0x4200000000000000000000000000000000000006",
      receiver: INPUT.owner,
      sellAmount: "11900000",
      buyAmount: "4500000000000000",
      feeAmount: "100000",
      validTo: 1_770_300_000,
      appData:
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      kind: "sell",
      partiallyFillable: false,
      ...overrides,
    },
    from: INPUT.owner,
    expiration: "2026-08-05T12:05:00.000Z",
    verified: true,
  } as OrderQuoteResponse;
}

describe("canonical CoW PRESIGN order", () => {
  it("creates the same 56-byte UID for the same accepted quote", async () => {
    const first = await buildPresignOrder(INPUT, quote(), NOW);
    const second = await buildPresignOrder(INPUT, quote(), NOW);

    expect(first.uid).toBe(second.uid);
    expect(first.uid).toMatch(/^0x[a-f0-9]{112}$/i);
    expect(first.order).toMatchObject({
      receiver: INPUT.owner,
      kind: "sell",
      partiallyFillable: false,
      buyAmount: "4500000000000000",
    });
  });

  it("changes the UID when the exact quoted buy amount changes", async () => {
    const original = await buildPresignOrder(INPUT, quote(), NOW);
    const changed = await buildPresignOrder(
      INPUT,
      quote({ buyAmount: "4600000000000000" }),
      NOW,
    );

    expect(changed.uid).not.toBe(original.uid);
  });

  it("rejects a quote that does not return proceeds to the connected owner", async () => {
    await expect(
      buildPresignOrder(
        INPUT,
        quote({ receiver: "0x2222222222222222222222222222222222222222" }),
        NOW,
      ),
    ).rejects.toThrow("protected sell order");
  });

  it("rejects readable app data without CoW's accompanying hash", async () => {
    await expect(
      buildPresignOrder(INPUT, quote({ appData: "{}" }), NOW),
    ).rejects.toThrow("protected sell order");
  });
});
