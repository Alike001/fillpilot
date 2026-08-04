import { fc, test } from "@fast-check/vitest";
import { expect } from "vitest";

import { CHECKPOINT_LEAD_MS, decideCheckpoint } from "./checkpoint";
import { canScheduleWrite, type Goal, type GoalState } from "./goal";
import { timestampMs, tokenAmount } from "./types";

const deadline = timestampMs(1_000_000);
const dueAt = timestampMs(Number(deadline) - CHECKPOINT_LEAD_MS);

function watchingGoal(minimum: bigint, replacementCount = 0): Goal {
  return {
    deadline,
    id: "property-goal",
    minimumBuyAmount: tokenAmount(minimum),
    replacementCount,
    state: "WATCHING",
  };
}

test.prop([
  fc.bigInt({ min: 0n, max: 10n ** 30n }),
  fc.bigInt({ min: 0n, max: 10n ** 30n }),
])("uses bigint floor comparisons with equality allowed", (minimum, quote) => {
  const action = decideCheckpoint({
    goal: watchingGoal(minimum),
    now: dueAt,
    orderState: "OPEN",
    quote: {
      buyAmount: tokenAmount(quote),
      executable: true,
      receivedAt: dueAt,
      validUntil: timestampMs(Number(dueAt) + 1),
    },
  }).action;

  expect(action).toBe(quote >= minimum ? "REPLACE_ONCE" : "KEEP_WATCHING");
});

test.prop([fc.integer({ min: 1, max: 100 })])(
  "never recommends a second replacement",
  (replacementCount) => {
    const action = decideCheckpoint({
      goal: watchingGoal(1n, replacementCount),
      now: dueAt,
      orderState: "OPEN",
      quote: {
        buyAmount: tokenAmount(10n ** 30n),
        executable: true,
        receivedAt: dueAt,
        validUntil: timestampMs(Number(dueAt) + 1),
      },
    }).action;

    expect(action).toBe("KEEP_WATCHING");
  },
);

test.prop([fc.constantFrom<GoalState>("FULFILLED", "MISSED", "FAILED")])(
  "terminal goals never schedule writes",
  (state) => {
    expect(canScheduleWrite(state)).toBe(false);
  },
);
