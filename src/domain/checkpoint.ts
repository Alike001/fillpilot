import { isTerminal, type Goal, type OrderState } from "./goal";
import type { TimestampMs, TokenAmount } from "./types";

export const CHECKPOINT_LEAD_MS = 5 * 60 * 1000;
export const MIN_GOAL_DURATION_MS = 10 * 60 * 1000;
export const MAX_QUOTE_AGE_MS = 60 * 1000;
export const CHECKPOINT_RULE_VERSION = "fillpilot-checkpoint/v1";

export type QuoteSnapshot = {
  readonly buyAmount: TokenAmount;
  readonly executable: boolean;
  readonly receivedAt: TimestampMs;
  readonly validUntil: TimestampMs;
};

export type CheckpointInput = {
  readonly goal: Goal;
  readonly now: TimestampMs;
  readonly orderState: OrderState;
  readonly quote?: QuoteSnapshot;
};

export type DecisionAction =
  | "KEEP_WATCHING"
  | "REPLACE_ONCE"
  | "RECONCILE_FULFILLED"
  | "MARK_MISSED"
  | "NOOP_TERMINAL";

export type CheckpointDecision = {
  readonly action: DecisionAction;
  readonly explanation: string;
  readonly ruleVersion: typeof CHECKPOINT_RULE_VERSION;
};

export function checkpointAt(deadline: TimestampMs): TimestampMs {
  return (Number(deadline) - CHECKPOINT_LEAD_MS) as TimestampMs;
}

export function validateGoalWindow(
  createdAt: TimestampMs,
  deadline: TimestampMs,
): void {
  if (Number(deadline) - Number(createdAt) < MIN_GOAL_DURATION_MS) {
    throw new RangeError(
      "Goals need at least ten minutes before their deadline",
    );
  }
}

export function isAtOrAboveFloor(
  buyAmount: TokenAmount,
  minimumBuyAmount: TokenAmount,
): boolean {
  return buyAmount >= minimumBuyAmount;
}

export function isFreshExecutableQuote(
  quote: QuoteSnapshot | undefined,
  now: TimestampMs,
): quote is QuoteSnapshot {
  return Boolean(
    quote &&
    quote.executable &&
    Number(quote.receivedAt) <= Number(now) &&
    Number(now) - Number(quote.receivedAt) <= MAX_QUOTE_AGE_MS &&
    Number(quote.validUntil) > Number(now),
  );
}

export function decideCheckpoint(input: CheckpointInput): CheckpointDecision {
  const { goal, now, orderState, quote } = input;
  if (orderState === "FULFILLED")
    return decision("RECONCILE_FULFILLED", "order fulfilled");
  if (isTerminal(goal.state))
    return decision("NOOP_TERMINAL", "goal already terminal");
  if (Number(now) >= Number(goal.deadline))
    return decision("MARK_MISSED", "deadline passed");
  if (orderState === "CANCELLED" || orderState === "EXPIRED") {
    return decision("MARK_MISSED", "order is no longer open");
  }
  if (Number(now) < Number(checkpointAt(goal.deadline))) {
    return decision("KEEP_WATCHING", "checkpoint not due");
  }
  if (goal.replacementCount > 0) {
    return decision("KEEP_WATCHING", "replacement limit reached");
  }
  if (!isFreshExecutableQuote(quote, now)) {
    return decision("KEEP_WATCHING", "no fresh executable quote");
  }
  if (!isAtOrAboveFloor(quote.buyAmount, goal.minimumBuyAmount)) {
    return decision("KEEP_WATCHING", "quote below minimum receive");
  }
  return decision("REPLACE_ONCE", "fresh quote meets minimum receive");
}

function decision(
  action: DecisionAction,
  explanation: string,
): CheckpointDecision {
  return { action, explanation, ruleVersion: CHECKPOINT_RULE_VERSION };
}
