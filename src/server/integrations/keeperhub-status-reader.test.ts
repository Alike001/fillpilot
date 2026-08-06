import { describe, expect, it, vi } from "vitest";

import { reconcileKeeperHubExecution } from "./keeperhub-execution-reconciliation";
import { KeeperHubStatusReader } from "./keeperhub-status-reader";

const EXECUTION_ID = "direct_fillpilot_presign_1";

function response(status: number, body: unknown, pollHint?: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...(pollHint ? { "X-Poll-Interval-Hint": pollHint } : {}),
    },
  });
}

describe("KeeperHub direct-execution status reader", () => {
  it("issues only a GET and carries KeeperHub's poll hint into reconciliation", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        response(200, { executionId: EXECUTION_ID, status: "running" }, "3"),
      );
    const reader = new KeeperHubStatusReader({
      apiKey: "kh_test_only",
      baseUrl: "https://keeperhub.test",
      fetcher,
    });

    await expect(
      reconcileKeeperHubExecution(reader, EXECUTION_ID),
    ).resolves.toEqual({
      state: "SUBMITTED",
      executionId: EXECUTION_ID,
      retryAfterMs: 3_000,
    });
    expect(fetcher).toHaveBeenCalledWith(
      `https://keeperhub.test/api/execute/${EXECUTION_ID}/status`,
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("does not turn a malformed poll hint into an unsafe retry interval", async () => {
    const reader = new KeeperHubStatusReader({
      apiKey: "kh_test_only",
      fetcher: vi
        .fn()
        .mockResolvedValue(
          response(
            200,
            { executionId: EXECUTION_ID, status: "pending" },
            "not-a-number",
          ),
        ),
    });

    await expect(
      reconcileKeeperHubExecution(reader, EXECUTION_ID),
    ).resolves.toMatchObject({ retryAfterMs: 1_000 });
  });

  it("rejects an HTTP error instead of treating it as an execution state", async () => {
    const reader = new KeeperHubStatusReader({
      apiKey: "kh_test_only",
      fetcher: vi
        .fn()
        .mockResolvedValue(response(401, { error: "unauthorized" })),
    });

    await expect(reader.getStatus(EXECUTION_ID)).rejects.toThrow(
      "status read failed",
    );
  });
});
