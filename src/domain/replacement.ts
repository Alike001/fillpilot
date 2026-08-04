export type ReplacementState =
  | "NONE"
  | "NEW_PRESIGN_CONFIRMED"
  | "OLD_INVALIDATED"
  | "POSTED"
  | "COMPENSATED"
  | "FAILED";

export type ReplacementEvent =
  | "CONFIRM_NEW_PRESIGN"
  | "CONFIRM_OLD_INVALIDATION"
  | "POST_NEW_ORDER"
  | "CLEAN_UP_UNUSED_PRESIGN"
  | "FAIL";

const terminalStates = new Set<ReplacementState>([
  "POSTED",
  "COMPENSATED",
  "FAILED",
]);

export function isReplacementTerminal(state: ReplacementState): boolean {
  return terminalStates.has(state);
}

export function transitionReplacement(
  state: ReplacementState,
  event: ReplacementEvent,
): ReplacementState {
  if (isReplacementTerminal(state)) {
    throw new Error(`Terminal replacement cannot accept ${event}`);
  }
  if (event === "FAIL") return "FAILED";
  if (state === "NONE" && event === "CONFIRM_NEW_PRESIGN") {
    return "NEW_PRESIGN_CONFIRMED";
  }
  if (
    state === "NEW_PRESIGN_CONFIRMED" &&
    event === "CONFIRM_OLD_INVALIDATION"
  ) {
    return "OLD_INVALIDATED";
  }
  if (state === "OLD_INVALIDATED" && event === "POST_NEW_ORDER") {
    return "POSTED";
  }
  if (
    state === "NEW_PRESIGN_CONFIRMED" &&
    event === "CLEAN_UP_UNUSED_PRESIGN"
  ) {
    return "COMPENSATED";
  }
  throw new Error(`Cannot ${event} while replacement is ${state}`);
}
