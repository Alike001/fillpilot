import { desc, eq } from "drizzle-orm";
import type { Address } from "@cowprotocol/sdk-config";

import { orderUid, timestampMs, tokenAmount } from "@/domain/types";
import type {
  CheckpointContextSource,
  CheckpointDecisionStore,
} from "@/worker/checkpoint-handler";
import type { StoredCheckpointDecision } from "@/worker/checkpoint-decision";

import { createDatabase } from "./client";
import { connections, decisions, goals, orders } from "./schema";

export class PostgresCheckpointStore
  implements CheckpointContextSource, CheckpointDecisionStore
{
  async load(goalId: string) {
    const { client, db } = createDatabase();
    try {
      const [row] = await db
        .select({
          deadline: goals.deadline,
          goalId: goals.id,
          minimumBuyAmount: goals.minimumBuyAmount,
          owner: connections.walletAddress,
          replacementCount: goals.replacementCount,
          sellAmount: goals.sellAmount,
          state: goals.state,
          uid: orders.uid,
        })
        .from(goals)
        .innerJoin(connections, eq(connections.id, goals.connectionId))
        .innerJoin(orders, eq(orders.goalId, goals.id))
        .where(eq(goals.id, goalId))
        .orderBy(desc(orders.createdAt))
        .limit(1);
      if (!row?.uid) return undefined;

      return {
        goal: {
          id: row.goalId,
          state: row.state,
          deadline: timestampMs(row.deadline.getTime()),
          minimumBuyAmount: tokenAmount(BigInt(row.minimumBuyAmount)),
          replacementCount: row.replacementCount,
        },
        orderUid: orderUid(row.uid),
        owner: row.owner as Address,
        sellAmount: tokenAmount(BigInt(row.sellAmount)),
      };
    } finally {
      await client.end();
    }
  }

  async record(goalId: string, decision: StoredCheckpointDecision) {
    const { client, db } = createDatabase();
    try {
      await db
        .insert(decisions)
        .values({
          goalId,
          ruleVersion: decision.ruleVersion,
          inputHash: decision.inputHash,
          inputs: decision.inputs,
          output: decision.output,
          explanation: decision.explanation,
        })
        .onConflictDoNothing({
          target: [decisions.goalId, decisions.inputHash],
        });
    } finally {
      await client.end();
    }
  }
}
