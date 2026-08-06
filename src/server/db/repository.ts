import { createHash } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";

import { validateGoalDraft, type GoalDraftInput } from "@/domain/goal-draft";
import { encryptSecret } from "@/server/connections/crypto";
import type { ConnectionAuthState } from "@/server/connections/mcp-oauth";
import type { ReconciledExecution } from "@/server/integrations/keeperhub-execution-reconciliation";

import { createDatabase } from "./client";
import { connections, goals, keeperhubExecutions } from "./schema";

const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const BASE_WETH = "0x4200000000000000000000000000000000000006";

export async function saveDraftGoal(
  auth: ConnectionAuthState,
  input: GoalDraftInput,
) {
  const walletAddress = auth.walletAddress;
  if (!walletAddress || !auth.tokens?.access_token) {
    throw new Error("A connected KeeperHub organization is required");
  }
  const draft = validateGoalDraft(input);
  const { client, db } = createDatabase();
  try {
    return await db.transaction(async (tx) => {
      const fingerprint = createHash("sha256")
        .update(walletAddress.toLowerCase())
        .digest("hex");
      const [connection] = await tx
        .insert(connections)
        .values({
          organizationFingerprint: fingerprint,
          walletAddress,
          encryptedTokens: encryptSecret(JSON.stringify(auth)),
        })
        .onConflictDoUpdate({
          target: connections.organizationFingerprint,
          set: {
            walletAddress,
            encryptedTokens: encryptSecret(JSON.stringify(auth)),
            updatedAt: new Date(),
          },
        })
        .returning({ id: connections.id });
      const [goal] = await tx
        .insert(goals)
        .values({
          connectionId: connection.id,
          sellToken: BASE_USDC,
          buyToken: BASE_WETH,
          sellAmount: draft.sellAmount.toString(),
          preferredBuyAmount: draft.preferredBuyAmount.toString(),
          minimumBuyAmount: draft.minimumBuyAmount.toString(),
          deadline: new Date(Number(draft.deadline)),
        })
        .returning({ id: goals.id });
      return goal;
    });
  } finally {
    await client.end();
  }
}

export async function readGoalForWallet(goalId: string, walletAddress: string) {
  const fingerprint = createHash("sha256")
    .update(walletAddress.toLowerCase())
    .digest("hex");
  const { client, db } = createDatabase();
  try {
    const [goal] = await db
      .select({
        id: goals.id,
        sellAmount: goals.sellAmount,
        minimumBuyAmount: goals.minimumBuyAmount,
        deadline: goals.deadline,
        state: goals.state,
        walletAddress: connections.walletAddress,
      })
      .from(goals)
      .innerJoin(connections, eq(goals.connectionId, connections.id))
      .where(
        and(
          eq(goals.id, goalId),
          eq(connections.organizationFingerprint, fingerprint),
        ),
      )
      .limit(1);
    return goal;
  } finally {
    await client.end();
  }
}

export async function listGoalHistoryForWallet(walletAddress: string) {
  const fingerprint = createHash("sha256")
    .update(walletAddress.toLowerCase())
    .digest("hex");
  const { client, db } = createDatabase();
  try {
    const rows = await db
      .select({
        id: goals.id,
        sellAmount: goals.sellAmount,
        minimumBuyAmount: goals.minimumBuyAmount,
        deadline: goals.deadline,
        state: goals.state,
        createdAt: goals.createdAt,
        executionState: keeperhubExecutions.state,
        operation: keeperhubExecutions.operation,
        simulation: keeperhubExecutions.simulation,
        executionCreatedAt: keeperhubExecutions.createdAt,
      })
      .from(goals)
      .innerJoin(connections, eq(goals.connectionId, connections.id))
      .leftJoin(keeperhubExecutions, eq(keeperhubExecutions.goalId, goals.id))
      .where(eq(connections.organizationFingerprint, fingerprint))
      .orderBy(desc(goals.createdAt), desc(keeperhubExecutions.createdAt));

    const byGoal = new Map<
      string,
      {
        id: string;
        sellAmount: string;
        minimumBuyAmount: string;
        deadline: Date;
        state: string;
        createdAt: Date;
        latestExecution?: {
          state: string;
          operation: string;
          simulation: unknown;
          createdAt: Date;
        };
      }
    >();
    for (const row of rows) {
      if (!byGoal.has(row.id)) {
        byGoal.set(row.id, {
          id: row.id,
          sellAmount: row.sellAmount,
          minimumBuyAmount: row.minimumBuyAmount,
          deadline: row.deadline,
          state: row.state,
          createdAt: row.createdAt,
          ...(row.executionState && row.operation && row.executionCreatedAt
            ? {
                latestExecution: {
                  state: row.executionState,
                  operation: row.operation,
                  simulation: row.simulation,
                  createdAt: row.executionCreatedAt,
                },
              }
            : {}),
        });
      }
    }
    return [...byGoal.values()];
  } finally {
    await client.end();
  }
}

export async function recordSimulationEvidence(input: {
  goalId: string;
  idempotencyKey: string;
  operation: string;
  simulation: unknown;
}) {
  const { client, db } = createDatabase();
  try {
    const [record] = await db
      .insert(keeperhubExecutions)
      .values({
        goalId: input.goalId,
        operation: input.operation,
        idempotencyKey: input.idempotencyKey,
        simulation: input.simulation,
        state: "SIMULATED",
      })
      .onConflictDoNothing({
        target: keeperhubExecutions.idempotencyKey,
      })
      .returning({
        id: keeperhubExecutions.id,
        state: keeperhubExecutions.state,
      });
    return record;
  } finally {
    await client.end();
  }
}

export async function recordSubmittedExecution(input: {
  goalId: string;
  idempotencyKey: string;
  operation: string;
  simulation: unknown;
  executionId: string;
}) {
  const { client, db } = createDatabase();
  try {
    const [record] = await db
      .insert(keeperhubExecutions)
      .values({
        goalId: input.goalId,
        idempotencyKey: input.idempotencyKey,
        operation: input.operation,
        simulation: input.simulation,
        executionId: input.executionId,
        state: "SUBMITTED",
      })
      .onConflictDoNothing({
        target: keeperhubExecutions.idempotencyKey,
      })
      .returning({
        id: keeperhubExecutions.id,
        executionId: keeperhubExecutions.executionId,
        state: keeperhubExecutions.state,
      });
    return record;
  } finally {
    await client.end();
  }
}

/**
 * Persist only a status read that belongs to an execution FillPilot previously
 * recorded. This cannot create an execution row or turn a terminal row back
 * into a submitted one.
 */
export async function readExecutionForWallet(input: {
  goalId: string;
  executionId: string;
  walletAddress: string;
}) {
  const fingerprint = createHash("sha256")
    .update(input.walletAddress.toLowerCase())
    .digest("hex");
  const { client, db } = createDatabase();
  try {
    const [record] = await db
      .select({
        id: keeperhubExecutions.id,
        executionId: keeperhubExecutions.executionId,
        state: keeperhubExecutions.state,
      })
      .from(keeperhubExecutions)
      .innerJoin(goals, eq(keeperhubExecutions.goalId, goals.id))
      .innerJoin(connections, eq(goals.connectionId, connections.id))
      .where(
        and(
          eq(keeperhubExecutions.goalId, input.goalId),
          eq(keeperhubExecutions.executionId, input.executionId),
          eq(connections.organizationFingerprint, fingerprint),
        ),
      )
      .limit(1);
    return record;
  } finally {
    await client.end();
  }
}

export async function applyExecutionReconciliation(
  recordId: string,
  input: ReconciledExecution,
) {
  const { client, db } = createDatabase();
  try {
    const [record] = await db
      .update(keeperhubExecutions)
      .set({
        state: input.state,
        transactionHash:
          input.state === "CONFIRMED" ? input.transactionHash : undefined,
        transactionLink:
          input.state === "CONFIRMED" ? input.transactionLink : undefined,
        gasUsed: input.state === "CONFIRMED" ? input.gasUsedWei : undefined,
        error: input.state === "FAILED" ? input.error : undefined,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(keeperhubExecutions.id, recordId),
          eq(keeperhubExecutions.executionId, input.executionId),
          inArray(keeperhubExecutions.state, ["SIMULATED", "SUBMITTED"]),
        ),
      )
      .returning({
        id: keeperhubExecutions.id,
        state: keeperhubExecutions.state,
        transactionHash: keeperhubExecutions.transactionHash,
      });
    return record;
  } finally {
    await client.end();
  }
}
