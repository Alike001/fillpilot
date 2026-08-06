import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";

import { validateGoalDraft, type GoalDraftInput } from "@/domain/goal-draft";
import { encryptSecret } from "@/server/connections/crypto";
import type { ConnectionAuthState } from "@/server/connections/mcp-oauth";

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
