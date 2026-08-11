import { checkpointAt, type QuoteSnapshot } from "@/domain/checkpoint";
import { isTerminal, type Goal } from "@/domain/goal";
import {
  timestampMs,
  type OrderUid,
  type TimestampMs,
  type TokenAmount,
} from "@/domain/types";
import type { Address } from "@cowprotocol/sdk-config";
import {
  type LeasedWork,
  WorkFailure,
  type WorkHandler,
} from "@/worker/worker-cycle";

import {
  evaluateCheckpoint,
  type StoredCheckpointDecision,
} from "./checkpoint-decision";
import { toFillPilotOrderState } from "./cow-order-state";

export type PostedOrderCheckpoint = {
  readonly goal: Goal;
  readonly orderUid: OrderUid;
  readonly owner: Address;
  readonly sellAmount: TokenAmount;
};

export type CheckpointContextSource = {
  load(goalId: string): Promise<PostedOrderCheckpoint | undefined>;
};

export type FreshQuoteSource = {
  read(context: PostedOrderCheckpoint, now: Date): Promise<QuoteSnapshot>;
};

export type CowOrderStatusSource = {
  read(
    orderUid: OrderUid,
  ): Promise<Parameters<typeof toFillPilotOrderState>[0]>;
};

export type CheckpointDecisionStore = {
  record(goalId: string, decision: StoredCheckpointDecision): Promise<void>;
};

function needsFreshQuote(
  goal: Goal,
  now: TimestampMs,
  orderState: string,
): boolean {
  return (
    orderState === "OPEN" &&
    !isTerminal(goal.state) &&
    goal.replacementCount === 0 &&
    now >= checkpointAt(goal.deadline) &&
    now < goal.deadline
  );
}

/**
 * This handler has no write dependency. It turns a persisted posted-order
 * context plus a fresh CoW quote into durable, reproducible decision evidence.
 * A later separately approved stage may consume only a REPLACE_ONCE receipt.
 */
export class CheckpointHandler implements WorkHandler {
  constructor(
    private readonly contextSource: CheckpointContextSource,
    private readonly statusSource: CowOrderStatusSource,
    private readonly quoteSource: FreshQuoteSource,
    private readonly decisionStore: CheckpointDecisionStore,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async handle(work: LeasedWork): Promise<void> {
    if (work.kind !== "CHECKPOINT") {
      throw new WorkFailure("VALIDATION", "Unsupported work item kind");
    }
    const context = await this.contextSource.load(work.goalId);
    if (!context) {
      throw new WorkFailure("VALIDATION", "Posted order context is missing");
    }

    const nowDate = this.clock();
    const now = timestampMs(nowDate.getTime());
    let orderState;
    try {
      orderState = toFillPilotOrderState(
        await this.statusSource.read(context.orderUid),
      );
    } catch (error) {
      throw new WorkFailure(
        "VALIDATION",
        error instanceof Error ? error.message : "Invalid CoW order status",
      );
    }

    const quote = needsFreshQuote(context.goal, now, orderState)
      ? await this.quoteSource.read(context, nowDate)
      : undefined;
    const evaluation = evaluateCheckpoint({
      goal: context.goal,
      now,
      orderState,
      quote,
    });
    await this.decisionStore.record(work.goalId, evaluation.stored);
  }
}
