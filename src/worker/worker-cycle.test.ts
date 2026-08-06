import { describe, expect, it, vi } from "vitest";

import { WorkFailure, runWorkerCycle, type WorkQueue } from "./worker-cycle";

const now = new Date("2026-08-06T12:00:00.000Z");

function queue(work?: { id: string; kind: string; goalId: string }): WorkQueue {
  return {
    claimDue: vi.fn().mockResolvedValue(work),
    complete: vi.fn().mockResolvedValue(undefined),
    fail: vi.fn().mockResolvedValue(undefined),
  };
}

describe("worker cycle", () => {
  it("stays idle without claiming, handling, or mutating a missing job", async () => {
    const workQueue = queue();
    const handler = { handle: vi.fn() };

    await expect(runWorkerCycle(workQueue, handler, now)).resolves.toBe("idle");
    expect(handler.handle).not.toHaveBeenCalled();
    expect(workQueue.complete).not.toHaveBeenCalled();
    expect(workQueue.fail).not.toHaveBeenCalled();
  });

  it("completes exactly the job it leased after the handler succeeds", async () => {
    const workQueue = queue({
      id: "work-1",
      kind: "CHECKPOINT",
      goalId: "goal-1",
    });
    const handler = { handle: vi.fn().mockResolvedValue(undefined) };

    await expect(runWorkerCycle(workQueue, handler, now)).resolves.toBe(
      "completed",
    );
    expect(workQueue.complete).toHaveBeenCalledWith("work-1");
    expect(workQueue.fail).not.toHaveBeenCalled();
  });

  it("records an explicit retry reason when a handler fails", async () => {
    const workQueue = queue({
      id: "work-1",
      kind: "CHECKPOINT",
      goalId: "goal-1",
    });
    const handler = {
      handle: vi.fn().mockRejectedValue(new WorkFailure("NETWORK", "offline")),
    };

    await expect(runWorkerCycle(workQueue, handler, now)).resolves.toBe(
      "failed",
    );
    expect(workQueue.fail).toHaveBeenCalledWith("work-1", now, "NETWORK");
    expect(workQueue.complete).not.toHaveBeenCalled();
  });
});
