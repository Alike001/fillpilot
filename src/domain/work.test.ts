import { describe, expect, it } from "vitest";

import {
  MAX_RETRY_DELAY_MS,
  canClaim,
  claimWorkItem,
  classifyRetry,
  completeWorkItem,
  failWorkItem,
  isDuplicateWork,
  retryDelayMs,
  type WorkItem,
} from "./work";
import { timestampMs } from "./types";

const pending: WorkItem = {
  attempts: 0,
  deduplicationKey: "goal-1:checkpoint",
  dueAt: timestampMs(100),
  state: "PENDING",
};

describe("work-item contracts", () => {
  it("deduplicates work by its explicit, durable key", () => {
    expect(isDuplicateWork(pending, { ...pending })).toBe(true);
    expect(
      isDuplicateWork(pending, {
        ...pending,
        deduplicationKey: "goal-1:reconcile",
      }),
    ).toBe(false);
  });

  it("claims only due or expired leased work", () => {
    expect(canClaim(pending, timestampMs(99))).toBe(false);
    expect(() => claimWorkItem(pending, timestampMs(99), 1_000)).toThrow(
      /not claimable/,
    );

    const claimed = claimWorkItem(pending, timestampMs(100), 1_000);
    expect(claimed).toMatchObject({ state: "LEASED", leaseExpiresAt: 1_100 });
    expect(canClaim(claimed, timestampMs(1_099))).toBe(false);
    expect(canClaim(claimed, timestampMs(1_100))).toBe(true);
  });

  it("uses bounded deterministic retries and terminal classifications", () => {
    expect(classifyRetry("NETWORK")).toBe("RETRYABLE");
    expect(classifyRetry("REVERT")).toBe("TERMINAL");
    expect(retryDelayMs(1)).toBe(1_000);
    expect(retryDelayMs(99)).toBe(MAX_RETRY_DELAY_MS);
    expect(() => retryDelayMs(0)).toThrow(/positive integer/);

    const retried = failWorkItem(
      claimWorkItem(pending, timestampMs(100), 100),
      timestampMs(200),
      "SERVER",
    );
    expect(retried).toMatchObject({
      attempts: 1,
      dueAt: 1_200,
      state: "PENDING",
    });
    expect(failWorkItem(retried, timestampMs(1_200), "VALIDATION").state).toBe(
      "DEAD",
    );
  });

  it("completes only a leased item", () => {
    expect(() => completeWorkItem(pending)).toThrow(/Only leased/);
    expect(
      completeWorkItem(claimWorkItem(pending, timestampMs(100), 100)).state,
    ).toBe("COMPLETE");
  });
});
