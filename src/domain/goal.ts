import type { TimestampMs, TokenAmount } from "./types";

export type GoalState =
  | "DRAFT"
  | "READY"
  | "WATCHING"
  | "REPLACING"
  | "FULFILLED"
  | "MISSED"
  | "FAILED";

export type OrderState = "OPEN" | "FULFILLED" | "CANCELLED" | "EXPIRED";

export type Goal = {
  readonly id: string;
  readonly state: GoalState;
  readonly deadline: TimestampMs;
  readonly minimumBuyAmount: TokenAmount;
  readonly replacementCount: number;
};

export type GoalEvent =
  | "ARM"
  | "START_WATCHING"
  | "BEGIN_REPLACEMENT"
  | "POST_REPLACEMENT"
  | "FULFILL"
  | "MISS"
  | "FAIL";

const terminalStates = new Set<GoalState>(["FULFILLED", "MISSED", "FAILED"]);

export function isTerminal(state: GoalState): boolean {
  return terminalStates.has(state);
}

export function canScheduleWrite(state: GoalState): boolean {
  return state === "READY" || state === "WATCHING" || state === "REPLACING";
}

export function transitionGoal(goal: Goal, event: GoalEvent): Goal {
  if (isTerminal(goal.state)) {
    throw new Error(`Terminal goal ${goal.id} cannot accept ${event}`);
  }

  if (event === "FULFILL") return { ...goal, state: "FULFILLED" };
  if (event === "MISS") return { ...goal, state: "MISSED" };
  if (event === "FAIL") return { ...goal, state: "FAILED" };

  if (event === "ARM" && goal.state === "DRAFT") {
    return { ...goal, state: "READY" };
  }
  if (event === "START_WATCHING" && goal.state === "READY") {
    return { ...goal, state: "WATCHING" };
  }
  if (event === "BEGIN_REPLACEMENT" && goal.state === "WATCHING") {
    if (goal.replacementCount !== 0) {
      throw new Error("A goal can replace its order at most once");
    }
    return { ...goal, state: "REPLACING" };
  }
  if (event === "POST_REPLACEMENT" && goal.state === "REPLACING") {
    return { ...goal, replacementCount: 1, state: "WATCHING" };
  }

  throw new Error(`Cannot ${event} a goal in ${goal.state}`);
}
