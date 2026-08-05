import { describe, expect, it } from "vitest";

import {
  CHECKPOINT_LEAD_TIME_MS,
  formatTokenAmount,
  MINIMUM_GOAL_DURATION_MS,
  validateGoalDraft,
} from "./goal-draft";

const NOW = Date.parse("2026-08-05T12:00:00.000Z");

describe("goal draft validation", () => {
  it("creates exact token amounts and the fixed checkpoint", () => {
    const deadline = new Date(NOW + 30 * 60 * 1000).toISOString();
    const draft = validateGoalDraft(
      {
        sellAmount: "12.5",
        preferredBuyAmount: "0.0042",
        minimumBuyAmount: "0.004",
        deadline,
      },
      NOW,
    );

    expect(draft.sellAmount).toBe(12_500_000n);
    expect(draft.preferredBuyAmount).toBe(4_200_000_000_000_000n);
    expect(draft.minimumBuyAmount).toBe(4_000_000_000_000_000n);
    expect(Number(draft.checkpointAt)).toBe(
      Number(draft.deadline) - CHECKPOINT_LEAD_TIME_MS,
    );
  });

  it("rejects a floor above the preferred receive amount", () => {
    expect(() =>
      validateGoalDraft(
        {
          sellAmount: "1",
          preferredBuyAmount: "0.002",
          minimumBuyAmount: "0.003",
          deadline: new Date(NOW + 30 * 60 * 1000).toISOString(),
        },
        NOW,
      ),
    ).toThrow("cannot exceed");
  });

  it("rejects a deadline before the fixed policy can run", () => {
    expect(() =>
      validateGoalDraft(
        {
          sellAmount: "1",
          preferredBuyAmount: "0.002",
          minimumBuyAmount: "0.001",
          deadline: new Date(NOW + MINIMUM_GOAL_DURATION_MS - 1).toISOString(),
        },
        NOW,
      ),
    ).toThrow("at least 10 minutes");
  });

  it("keeps exact decimal formatting without floating-point conversion", () => {
    expect(formatTokenAmount(1_230_000n, 6)).toBe("1.23");
    expect(formatTokenAmount(1_000_000_000_000_001n, 18)).toBe(
      "0.001000000000000001",
    );
  });
});
