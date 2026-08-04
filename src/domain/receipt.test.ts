import { describe, expect, it } from "vitest";

import { decideCheckpoint } from "./checkpoint";
import type { Goal } from "./goal";
import {
  canonicalJson,
  canonicalReceipt,
  createDecisionReceipt,
  hashInputs,
} from "./receipt";
import { timestampMs, tokenAmount } from "./types";

const goal: Goal = {
  deadline: timestampMs(900_000),
  id: "goal-1",
  minimumBuyAmount: tokenAmount(50n),
  replacementCount: 0,
  state: "WATCHING",
};

describe("decision receipts", () => {
  it("hashes equivalent inputs identically regardless of object-key order", () => {
    expect(hashInputs({ b: 2n, a: [1, "x"] })).toBe(
      hashInputs({ a: [1, "x"], b: 2n }),
    );
  });

  it("replays a checkpoint receipt byte-for-byte", () => {
    const inputs = {
      goal,
      now: timestampMs(600_000),
      orderState: "OPEN" as const,
      quote: {
        buyAmount: tokenAmount(50n),
        executable: true,
        receivedAt: timestampMs(600_000),
        validUntil: timestampMs(600_001),
      },
    };
    const first = createDecisionReceipt(inputs, decideCheckpoint(inputs));
    const second = createDecisionReceipt(
      { ...inputs },
      decideCheckpoint({ ...inputs }),
    );

    expect(canonicalReceipt(first)).toBe(canonicalReceipt(second));
    expect(first.output).toBe("REPLACE_ONCE");
  });

  it("rejects values that cannot produce an unambiguous replay", () => {
    expect(() => canonicalJson({ value: undefined })).toThrow(/not canonical/);
    const circular: { self?: unknown } = {};
    circular.self = circular;
    expect(() => canonicalJson(circular)).toThrow(/Circular/);
  });
});
