import type { TimestampMs } from "./types";

export const MAX_WORK_ATTEMPTS = 5;
export const BASE_RETRY_DELAY_MS = 1_000;
export const MAX_RETRY_DELAY_MS = 60_000;

export type RetryReason =
  | "NETWORK"
  | "RATE_LIMIT"
  | "SERVER"
  | "UNAUTHORIZED"
  | "VALIDATION"
  | "REVERT"
  | "CONFLICT"
  | "UNKNOWN";

export type WorkState = "PENDING" | "LEASED" | "COMPLETE" | "DEAD";

export type WorkItem = {
  readonly attempts: number;
  readonly deduplicationKey: string;
  readonly dueAt: TimestampMs;
  readonly leaseExpiresAt?: TimestampMs;
  readonly state: WorkState;
};

export function isDuplicateWork(left: WorkItem, right: WorkItem): boolean {
  return left.deduplicationKey === right.deduplicationKey;
}

export function classifyRetry(reason: RetryReason): "RETRYABLE" | "TERMINAL" {
  return reason === "NETWORK" || reason === "RATE_LIMIT" || reason === "SERVER"
    ? "RETRYABLE"
    : "TERMINAL";
}

export function retryDelayMs(attempts: number): number {
  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new RangeError("Retry attempts must be a positive integer");
  }
  return Math.min(
    BASE_RETRY_DELAY_MS * 2 ** (attempts - 1),
    MAX_RETRY_DELAY_MS,
  );
}

export function canClaim(item: WorkItem, now: TimestampMs): boolean {
  if (Number(item.dueAt) > Number(now)) return false;
  return (
    item.state === "PENDING" ||
    (item.state === "LEASED" &&
      item.leaseExpiresAt !== undefined &&
      Number(item.leaseExpiresAt) <= Number(now))
  );
}

export function claimWorkItem(
  item: WorkItem,
  now: TimestampMs,
  leaseMs: number,
): WorkItem {
  if (leaseMs <= 0 || !Number.isSafeInteger(leaseMs)) {
    throw new RangeError("Lease duration must be a positive safe integer");
  }
  if (!canClaim(item, now)) {
    throw new Error("Work item is not claimable");
  }
  return {
    ...item,
    leaseExpiresAt: (Number(now) + leaseMs) as TimestampMs,
    state: "LEASED",
  };
}

export function failWorkItem(
  item: WorkItem,
  now: TimestampMs,
  reason: RetryReason,
): WorkItem {
  const attempts = item.attempts + 1;
  if (classifyRetry(reason) === "TERMINAL" || attempts >= MAX_WORK_ATTEMPTS) {
    return { ...item, attempts, leaseExpiresAt: undefined, state: "DEAD" };
  }
  return {
    ...item,
    attempts,
    dueAt: (Number(now) + retryDelayMs(attempts)) as TimestampMs,
    leaseExpiresAt: undefined,
    state: "PENDING",
  };
}

export function completeWorkItem(item: WorkItem): WorkItem {
  if (item.state !== "LEASED") throw new Error("Only leased work can complete");
  return { ...item, leaseExpiresAt: undefined, state: "COMPLETE" };
}
