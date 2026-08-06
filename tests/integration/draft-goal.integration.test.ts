import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { decryptSecret } from "../../src/server/connections/crypto";
import {
  applyExecutionReconciliation,
  listGoalHistoryForWallet,
  recordSimulationEvidence,
  recordSubmittedExecution,
  readExecutionForWallet,
  saveDraftGoal,
} from "../../src/server/db/repository";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;
let client: ReturnType<typeof postgres> | undefined;

describeWithDatabase("draft goal persistence", () => {
  beforeAll(() => {
    client = postgres(databaseUrl as string, { max: 1 });
  });

  afterAll(async () => {
    await client?.end();
  });

  it("encrypts the connection and persists exact Base goal amounts", async () => {
    const walletAddress = "0x1111111111111111111111111111111111111111" as const;
    const deadline = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const saved = await saveDraftGoal(
      {
        walletAddress,
        tokens: { access_token: "test-access-token", token_type: "Bearer" },
      },
      {
        sellAmount: "12.345678",
        preferredBuyAmount: "0.00456789",
        minimumBuyAmount: "0.004",
        deadline,
      },
    );

    const [row] = await client!<
      {
        sell_amount: string;
        preferred_buy_amount: string;
        minimum_buy_amount: string;
        encrypted_tokens: string;
      }[]
    >`
      select g.sell_amount, g.preferred_buy_amount, g.minimum_buy_amount,
             c.encrypted_tokens
      from goals g
      join connections c on c.id = g.connection_id
      where g.id = ${saved.id}
    `;

    expect(row).toMatchObject({
      sell_amount: "12345678",
      preferred_buy_amount: "4567890000000000",
      minimum_buy_amount: "4000000000000000",
    });
    expect(decryptSecret(row.encrypted_tokens)).toContain("test-access-token");

    await client!`delete from goals where id = ${saved.id}`;
    await client!`delete from connections where wallet_address = ${walletAddress}`;
  });

  it("records one simulation evidence row for duplicate triggers", async () => {
    const walletAddress = "0x2222222222222222222222222222222222222222" as const;
    const saved = await saveDraftGoal(
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
    const input = {
      goalId: saved.id,
      idempotencyKey: `simulation:${saved.id}`,
      operation: "presign",
      simulation: { status: "simulated" },
    };
    await recordSimulationEvidence(input);
    await recordSimulationEvidence(input);
    await expect(listGoalHistoryForWallet(walletAddress)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: saved.id,
          latestExecution: expect.objectContaining({ state: "SIMULATED" }),
        }),
      ]),
    );
    const [{ count }] = await client!<
      { count: string }[]
    >`select count(*) from keeperhub_executions where goal_id = ${saved.id}`;
    expect(count).toBe("1");
    await client!`delete from goals where id = ${saved.id}`;
    await client!`delete from connections where wallet_address = ${walletAddress}`;
  });

  it("reconciles only the FillPilot execution record with matching evidence", async () => {
    const walletAddress = "0x3333333333333333333333333333333333333333" as const;
    const saved = await saveDraftGoal(
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
    const executionId = "direct_fillpilot_test_1";
    const submission = {
      goalId: saved.id,
      idempotencyKey: `execution:${saved.id}`,
      operation: "presign",
      executionId,
      simulation: { status: "simulated", gasEstimate: "65000" },
    };
    await recordSubmittedExecution(submission);
    await recordSubmittedExecution(submission);

    const stored = await readExecutionForWallet({
      goalId: saved.id,
      executionId,
      walletAddress,
    });
    expect(stored).toMatchObject({ executionId, state: "SUBMITTED" });

    await expect(
      applyExecutionReconciliation(stored!.id, {
        state: "CONFIRMED",
        executionId,
        transactionHash: `0x${"ab".repeat(32)}`,
        transactionLink: "https://base.blockscout.com/tx/proof",
        gasUsedWei: "42000",
      }),
    ).resolves.toMatchObject({ state: "CONFIRMED" });
    await expect(
      applyExecutionReconciliation(stored!.id, {
        state: "FAILED",
        executionId,
        error: "late status must not overwrite confirmed proof",
      }),
    ).resolves.toBeUndefined();

    const [row] = await client!<
      { state: string; transaction_hash: string; count: string }[]
    >`
      select state, transaction_hash,
        (select count(*) from keeperhub_executions where goal_id = ${saved.id}) as count
      from keeperhub_executions
      where execution_id = ${executionId}
    `;
    expect(row).toMatchObject({
      state: "CONFIRMED",
      transaction_hash: `0x${"ab".repeat(32)}`,
      count: "1",
    });
    await client!`delete from goals where id = ${saved.id}`;
    await client!`delete from connections where wallet_address = ${walletAddress}`;
  });
});
