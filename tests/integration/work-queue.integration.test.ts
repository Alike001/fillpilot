import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  enqueueCheckpointWork,
  saveDraftGoal,
} from "../../src/server/db/repository";
import { PostgresWorkQueue } from "../../src/server/db/work-queue";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;
let client: ReturnType<typeof postgres> | undefined;

describeWithDatabase("PostgreSQL work queue", () => {
  beforeAll(() => {
    client = postgres(databaseUrl as string, { max: 1 });
  });

  afterAll(async () => {
    await client?.end();
  });

  async function createDueWork(suffix: string) {
    const walletAddress = `0x${suffix.padStart(40, "0")}` as const;
    const goal = await saveDraftGoal(
      {
        walletAddress,
        tokens: { access_token: "test-token", token_type: "Bearer" },
      },
      {
        sellAmount: "1",
        preferredBuyAmount: "0.002",
        minimumBuyAmount: "0.001",
        deadline: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      },
    );
    const now = new Date("2026-08-11T12:00:00.000Z");
    await enqueueCheckpointWork({
      goalId: goal.id,
      kind: "CHECKPOINT",
      deduplicationKey: `integration:${suffix}:${goal.id}`,
      dueAt: new Date(now.getTime() - 1),
    });
    return { goalId: goal.id, now };
  }

  async function deleteGoal(goalId: string) {
    await client!`delete from goals where id = ${goalId}::uuid`;
  }

  it("lets only one concurrent worker lease a due checkpoint", async () => {
    const { goalId, now } = await createDueWork("44");
    const queue = new PostgresWorkQueue();

    try {
      const claims = await Promise.all([
        queue.claimDue(now, 60_000),
        queue.claimDue(now, 60_000),
      ]);
      const leased = claims.filter((claim) => claim !== undefined);

      expect(leased).toHaveLength(1);
      expect(leased[0]?.goalId).toBe(goalId);

      const [row] = await client!<
        { attempts: number; state: string }[]
      >`select attempts, state from work_items where goal_id = ${goalId}::uuid`;
      expect(row).toEqual({ attempts: 0, state: "LEASED" });

      await queue.complete(leased[0]!.id);
      await expect(
        queue.claimDue(new Date(now.getTime() + 60_001)),
      ).resolves.toBeUndefined();
    } finally {
      await deleteGoal(goalId);
    }
  });

  it("releases retryable failures on bounded backoff and kills terminal ones", async () => {
    const { goalId, now } = await createDueWork("55");
    const queue = new PostgresWorkQueue();

    try {
      const leased = await queue.claimDue(now, 60_000);
      expect(leased).toBeDefined();
      await queue.fail(leased!.id, now, "NETWORK");

      await expect(
        queue.claimDue(new Date(now.getTime() + 999)),
      ).resolves.toBeUndefined();
      const retried = await queue.claimDue(new Date(now.getTime() + 1_000));
      expect(retried?.id).toBe(leased!.id);

      await queue.fail(
        retried!.id,
        new Date(now.getTime() + 1_000),
        "VALIDATION",
      );
      const [row] = await client!<
        { attempts: number; state: string; last_error: { reason: string } }[]
      >`select attempts, state, last_error from work_items where id = ${leased!.id}::uuid`;
      expect(row).toEqual({
        attempts: 2,
        state: "DEAD",
        last_error: { reason: "VALIDATION" },
      });
    } finally {
      await deleteGoal(goalId);
    }
  });
});
