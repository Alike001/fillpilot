import { describe, expect, it } from "vitest";

import { timestampMs, tokenAmount } from "@/domain/types";

import { evaluateCheckpoint } from "./checkpoint-decision";

describe("checkpoint decision evidence", () => {
  it("persists a deterministic replacement decision without raw bigint JSON", () => {
    const input = {
      goal: {
        id: "goal-1",
        state: "WATCHING" as const,
        deadline: timestampMs(1_000_000),
        minimumBuyAmount: tokenAmount(100n),
        replacementCount: 0,
      },
      now: timestampMs(700_000),
      orderState: "OPEN" as const,
      quote: {
        buyAmount: tokenAmount(100n),
        executable: true,
        receivedAt: timestampMs(699_999),
        validUntil: timestampMs(700_001),
      },
    };

    const first = evaluateCheckpoint(input);
    const second = evaluateCheckpoint(input);

    expect(first.decision.action).toBe("REPLACE_ONCE");
    expect(first.stored).toMatchObject({
      output: "REPLACE_ONCE",
      ruleVersion: "fillpilot-checkpoint/v1",
    });
    expect(first.stored.inputHash).toBe(second.stored.inputHash);
    expect(JSON.stringify(first.stored.inputs)).toContain('"$bigint":"100"');
  });
});
