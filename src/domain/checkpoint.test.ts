import { describe, expect, it } from "vitest";

import {
  CHECKPOINT_LEAD_MS,
  MAX_QUOTE_AGE_MS,
  checkpointAt,
  decideCheckpoint,
  isFreshExecutableQuote,
  validateGoalWindow,
  type CheckpointInput,
} from "./checkpoint";
import type { Goal } from "./goal";
import { timestampMs, tokenAmount } from "./types";

const deadline = timestampMs(1_000_000);
const dueAt = timestampMs(Number(deadline) - CHECKPOINT_LEAD_MS);
const goal: Goal = {
  deadline,
  id: "goal-1",
  minimumBuyAmount: tokenAmount(100n),
  replacementCount: 0,
  state: "WATCHING",
};

function input(overrides: Partial<CheckpointInput> = {}): CheckpointInput {
  return {
    goal,
    now: dueAt,
    orderState: "OPEN",
    quote: {
      buyAmount: tokenAmount(100n),
      executable: true,
      receivedAt: dueAt,
      validUntil: timestampMs(Number(dueAt) + 1),
    },
    ...overrides,
  };
}

describe("checkpoint policy", () => {
  it("replaces exactly at the checkpoint when the fresh quote equals the floor", () => {
    expect(checkpointAt(deadline)).toBe(dueAt);
    expect(decideCheckpoint(input()).action).toBe("REPLACE_ONCE");
  });

  it("keeps watching before due, after a replacement, or for a stale/below-floor quote", () => {
    expect(
      decideCheckpoint(input({ now: timestampMs(Number(dueAt) - 1) })).action,
    ).toBe("KEEP_WATCHING");
    expect(
      decideCheckpoint(input({ goal: { ...goal, replacementCount: 1 } }))
        .action,
    ).toBe("KEEP_WATCHING");
    expect(
      decideCheckpoint(
        input({
          quote: {
            ...input().quote!,
            buyAmount: tokenAmount(99n),
          },
        }),
      ).action,
    ).toBe("KEEP_WATCHING");
    expect(
      decideCheckpoint(
        input({
          quote: {
            ...input().quote!,
            receivedAt: timestampMs(Number(dueAt) - MAX_QUOTE_AGE_MS - 1),
          },
        }),
      ).action,
    ).toBe("KEEP_WATCHING");
  });

  it("reconciles fulfillment and marks closed or expired goals honestly", () => {
    expect(decideCheckpoint(input({ orderState: "FULFILLED" })).action).toBe(
      "RECONCILE_FULFILLED",
    );
    expect(decideCheckpoint(input({ now: deadline })).action).toBe(
      "MARK_MISSED",
    );
    expect(decideCheckpoint(input({ orderState: "CANCELLED" })).action).toBe(
      "MARK_MISSED",
    );
    expect(
      decideCheckpoint(input({ goal: { ...goal, state: "FAILED" } })).action,
    ).toBe("NOOP_TERMINAL");
  });

  it("fails closed for malformed time windows and quotes", () => {
    expect(() =>
      validateGoalWindow(timestampMs(0), timestampMs(599_999)),
    ).toThrow(/at least ten minutes/);
    expect(isFreshExecutableQuote(undefined, dueAt)).toBe(false);
    expect(
      isFreshExecutableQuote({ ...input().quote!, executable: false }, dueAt),
    ).toBe(false);
  });
});
