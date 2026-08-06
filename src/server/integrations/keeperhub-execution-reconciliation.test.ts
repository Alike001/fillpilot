import { describe, expect, it, vi } from "vitest";

import { reconcileKeeperHubExecution } from "./keeperhub-execution-reconciliation";

const EXECUTION_ID = "direct_fillpilot_presign_1";

describe("KeeperHub execution reconciliation", () => {
  it("keeps a pending direct execution submitted without inventing a transaction", async () => {
    const getStatus = vi.fn().mockResolvedValue({
      executionId: EXECUTION_ID,
      status: "running",
    });

    await expect(
      reconcileKeeperHubExecution({ getStatus }, EXECUTION_ID),
    ).resolves.toEqual({
      state: "SUBMITTED",
      executionId: EXECUTION_ID,
      retryAfterMs: 1_000,
    });
  });

  it("requires a transaction hash and link before confirmation", async () => {
    const getStatus = vi.fn().mockResolvedValue({
      executionId: EXECUTION_ID,
      status: "completed",
    });

    await expect(
      reconcileKeeperHubExecution({ getStatus }, EXECUTION_ID),
    ).rejects.toThrow("missing onchain proof");
  });

  it("returns the exact transaction proof only for a completed execution", async () => {
    const getStatus = vi.fn().mockResolvedValue({
      executionId: EXECUTION_ID,
      status: "completed",
      transactionHash: `0x${"ab".repeat(32)}`,
      transactionLink: "https://base.blockscout.com/tx/proof",
      gasUsedWei: "42000",
    });

    await expect(
      reconcileKeeperHubExecution({ getStatus }, EXECUTION_ID),
    ).resolves.toEqual({
      state: "CONFIRMED",
      executionId: EXECUTION_ID,
      transactionHash: `0x${"ab".repeat(32)}`,
      transactionLink: "https://base.blockscout.com/tx/proof",
      gasUsedWei: "42000",
    });
  });

  it("records a failed remote execution as failed rather than retrying a write", async () => {
    const getStatus = vi.fn().mockResolvedValue({
      executionId: EXECUTION_ID,
      status: "failed",
      error: { error: "Daily spending cap exceeded" },
    });

    await expect(
      reconcileKeeperHubExecution({ getStatus }, EXECUTION_ID),
    ).resolves.toEqual({
      state: "FAILED",
      executionId: EXECUTION_ID,
      error: { error: "Daily spending cap exceeded" },
    });
  });

  it("rejects a response that could belong to another execution", async () => {
    const getStatus = vi.fn().mockResolvedValue({
      executionId: "direct_other",
      status: "failed",
    });

    await expect(
      reconcileKeeperHubExecution({ getStatus }, EXECUTION_ID),
    ).rejects.toThrow("mismatched");
  });
});
