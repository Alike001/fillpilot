import { OrderStatus } from "@cowprotocol/sdk-order-book";
import { describe, expect, it, vi } from "vitest";

import { orderUid, timestampMs, tokenAmount } from "@/domain/types";

import { CheckpointHandler } from "./checkpoint-handler";
import { WorkFailure } from "./worker-cycle";

const now = new Date("2026-08-11T12:00:00.000Z");
const work = { id: "work-1", kind: "CHECKPOINT", goalId: "goal-1" };

function context() {
  return {
    orderUid: orderUid(`0x${"ab".repeat(56)}`),
    goal: {
      id: "goal-1",
      state: "WATCHING" as const,
      deadline: timestampMs(now.getTime() + 5 * 60 * 1000),
      minimumBuyAmount: tokenAmount(100n),
      replacementCount: 0,
    },
  };
}

describe("checkpoint handler", () => {
  it("reads one fresh quote and records a reproducible replacement decision", async () => {
    const quoteSource = {
      read: vi.fn().mockResolvedValue({
        buyAmount: tokenAmount(100n),
        executable: true,
        receivedAt: timestampMs(now.getTime()),
        validUntil: timestampMs(now.getTime() + 1_000),
      }),
    };
    const decisionStore = { record: vi.fn().mockResolvedValue(undefined) };
    const handler = new CheckpointHandler(
      { load: vi.fn().mockResolvedValue(context()) },
      { read: vi.fn().mockResolvedValue(OrderStatus.OPEN) },
      quoteSource,
      decisionStore,
      () => now,
    );

    await handler.handle(work);

    expect(quoteSource.read).toHaveBeenCalledOnce();
    expect(decisionStore.record).toHaveBeenCalledWith(
      "goal-1",
      expect.objectContaining({ output: "REPLACE_ONCE" }),
    );
  });

  it("records fulfillment without requesting an unnecessary quote", async () => {
    const quoteSource = { read: vi.fn() };
    const decisionStore = { record: vi.fn().mockResolvedValue(undefined) };
    const handler = new CheckpointHandler(
      { load: vi.fn().mockResolvedValue(context()) },
      { read: vi.fn().mockResolvedValue(OrderStatus.FULFILLED) },
      quoteSource,
      decisionStore,
      () => now,
    );

    await handler.handle(work);

    expect(quoteSource.read).not.toHaveBeenCalled();
    expect(decisionStore.record).toHaveBeenCalledWith(
      "goal-1",
      expect.objectContaining({ output: "RECONCILE_FULFILLED" }),
    );
  });

  it("fails closed when the leased work does not name a checkpoint", async () => {
    const handler = new CheckpointHandler(
      { load: vi.fn() },
      { read: vi.fn() },
      { read: vi.fn() },
      { record: vi.fn() },
      () => now,
    );

    await expect(handler.handle({ ...work, kind: "UNKNOWN" })).rejects.toEqual(
      expect.objectContaining<Partial<WorkFailure>>({ reason: "VALIDATION" }),
    );
  });
});
