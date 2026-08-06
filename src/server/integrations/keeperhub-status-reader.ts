import type {
  KeeperHubExecutionReader,
  KeeperHubExecutionSnapshot,
  KeeperHubExecutionStatus,
} from "./keeperhub-execution-reconciliation";

type FetchLike = typeof fetch;

type KeeperHubStatusResponse = {
  readonly executionId?: string;
  readonly status?: KeeperHubExecutionStatus;
  readonly transactionHash?: `0x${string}`;
  readonly transactionLink?: string;
  readonly gasUsedWei?: string;
  readonly error?: unknown;
};

/** A read-only adapter for a KeeperHub execution ID that FillPilot already owns. */
export class KeeperHubStatusReader implements KeeperHubExecutionReader {
  constructor(
    private readonly options: {
      readonly apiKey: string;
      readonly baseUrl?: string;
      readonly fetcher?: FetchLike;
    },
  ) {}

  async getStatus(executionId: string): Promise<KeeperHubExecutionSnapshot> {
    if (executionId.trim().length === 0) {
      throw new Error("KeeperHub execution ID is required");
    }
    const response = await (this.options.fetcher ?? fetch)(
      `${this.options.baseUrl ?? "https://app.keeperhub.com"}/api/execute/${encodeURIComponent(executionId)}/status`,
      {
        headers: { Authorization: `Bearer ${this.options.apiKey}` },
        method: "GET",
      },
    );
    const payload = (await response.json()) as KeeperHubStatusResponse;
    if (!response.ok || !payload.executionId || !payload.status) {
      throw new Error(
        `KeeperHub status read failed: ${String(payload.error ?? response.status)}`,
      );
    }

    return {
      executionId: payload.executionId,
      status: payload.status,
      transactionHash: payload.transactionHash,
      transactionLink: payload.transactionLink,
      gasUsedWei: payload.gasUsedWei,
      error: payload.error,
      pollAfterMs: parsePollHint(response.headers.get("X-Poll-Interval-Hint")),
    };
  }
}

function parsePollHint(value: string | null): number | undefined {
  if (value === null) return undefined;
  const seconds = Number(value);
  if (!Number.isSafeInteger(seconds) || seconds < 0) return undefined;
  return seconds * 1_000;
}
