import type { RetryReason } from "@/domain/work";

export const DEFAULT_WORK_LEASE_MS = 60_000;

export type LeasedWork = {
  readonly id: string;
  readonly kind: string;
  readonly goalId: string;
};

export type WorkQueue = {
  claimDue(now: Date, leaseMs: number): Promise<LeasedWork | undefined>;
  complete(workId: string): Promise<void>;
  fail(workId: string, now: Date, reason: RetryReason): Promise<void>;
};

export type WorkHandler = {
  handle(work: LeasedWork): Promise<void>;
};

export class WorkFailure extends Error {
  constructor(
    readonly reason: RetryReason,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Run at most one job. The queue owns the atomic database lease and retry
 * mutation; this orchestration deliberately has no KeeperHub or CoW knowledge.
 */
export async function runWorkerCycle(
  queue: WorkQueue,
  handler: WorkHandler,
  now = new Date(),
  leaseMs = DEFAULT_WORK_LEASE_MS,
): Promise<"idle" | "completed" | "failed"> {
  if (!Number.isSafeInteger(leaseMs) || leaseMs <= 0) {
    throw new RangeError("Worker lease must be a positive safe integer");
  }
  const work = await queue.claimDue(now, leaseMs);
  if (!work) return "idle";

  try {
    await handler.handle(work);
    await queue.complete(work.id);
    return "completed";
  } catch (error) {
    await queue.fail(
      work.id,
      now,
      error instanceof WorkFailure ? error.reason : "UNKNOWN",
    );
    return "failed";
  }
}
