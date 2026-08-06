export type KeeperHubExecutionStatus =
  "pending" | "running" | "completed" | "failed";

export type KeeperHubExecutionSnapshot = {
  readonly executionId: string;
  readonly status: KeeperHubExecutionStatus;
  readonly transactionHash?: `0x${string}`;
  readonly transactionLink?: string;
  readonly gasUsedWei?: string;
  readonly error?: unknown;
  /** KeeperHub's X-Poll-Interval-Hint converted from seconds to milliseconds. */
  readonly pollAfterMs?: number;
};

export type KeeperHubExecutionReader = {
  getStatus(executionId: string): Promise<KeeperHubExecutionSnapshot>;
};

export type ReconciledExecution =
  | {
      readonly state: "SUBMITTED";
      readonly executionId: string;
      readonly retryAfterMs: number;
    }
  | {
      readonly state: "CONFIRMED";
      readonly executionId: string;
      readonly transactionHash: `0x${string}`;
      readonly transactionLink: string;
      readonly gasUsedWei?: string;
    }
  | {
      readonly state: "FAILED";
      readonly executionId: string;
      readonly error: unknown;
    };

const PENDING_POLL_MS = 1_000;

/**
 * Reconciles a previously-created direct-execution ID. This function has no
 * submission capability: it only reads the remote status endpoint.
 */
export async function reconcileKeeperHubExecution(
  reader: KeeperHubExecutionReader,
  executionId: string,
): Promise<ReconciledExecution> {
  if (executionId.trim().length === 0) {
    throw new Error("KeeperHub execution ID is required for reconciliation");
  }

  const snapshot = await reader.getStatus(executionId);
  if (snapshot.executionId !== executionId) {
    throw new Error("KeeperHub returned a mismatched execution ID");
  }
  if (snapshot.status === "pending" || snapshot.status === "running") {
    return {
      state: "SUBMITTED",
      executionId,
      retryAfterMs: snapshot.pollAfterMs ?? PENDING_POLL_MS,
    };
  }
  if (snapshot.status === "failed") {
    return {
      state: "FAILED",
      executionId,
      error: snapshot.error ?? "KeeperHub execution failed without an error",
    };
  }
  if (!snapshot.transactionHash || !snapshot.transactionLink) {
    throw new Error(
      "Completed KeeperHub execution is missing onchain proof fields",
    );
  }
  return {
    state: "CONFIRMED",
    executionId,
    transactionHash: snapshot.transactionHash,
    transactionLink: snapshot.transactionLink,
    gasUsedWei: snapshot.gasUsedWei,
  };
}
