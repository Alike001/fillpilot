import { checkpointAt } from "@/domain/checkpoint";
import { timestampMs } from "@/domain/types";

export const CHECKPOINT_WORK_KIND = "CHECKPOINT";

export type CheckpointWork = {
  readonly deduplicationKey: string;
  readonly dueAt: Date;
  readonly goalId: string;
  readonly kind: typeof CHECKPOINT_WORK_KIND;
};

/**
 * Create the one durable checkpoint job for a goal. This contains no network
 * call and does not decide or execute a replacement; it only gives the worker
 * a stable, deduplicated time at which to inspect the eventual live order.
 */
export function buildCheckpointWork(
  goalId: string,
  deadline: Date,
): CheckpointWork {
  if (!goalId.trim()) throw new RangeError("Checkpoint work requires a goal");
  const deadlineMs = deadline.getTime();
  if (!Number.isSafeInteger(deadlineMs)) {
    throw new RangeError("Checkpoint work requires a valid deadline");
  }
  const dueAt = checkpointAt(timestampMs(deadlineMs));
  return {
    goalId,
    kind: CHECKPOINT_WORK_KIND,
    deduplicationKey: `${goalId}:checkpoint:v1`,
    dueAt: new Date(Number(dueAt)),
  };
}
