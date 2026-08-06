import { describe, expect, it, vi } from "vitest";
import { encodeFunctionData } from "viem";

import { KeeperHubDirectExecutor } from "./keeperhub-direct-executor";
import { cowPresignAbi } from "./keeperhub-direct-simulator";

const ORDER_UID = `0x${"ab".repeat(56)}` as `0x${string}`;
const REQUEST = {
  goalId: "goal-1",
  orderUid: ORDER_UID,
  to: "0x9008d19f58aabd9ed0d60971565aa8510560ab41" as `0x${string}`,
  data: encodeFunctionData({
    abi: cowPresignAbi,
    functionName: "setPreSignature",
    args: [ORDER_UID, true],
  }),
};

describe("KeeperHubDirectExecutor", () => {
  it("fails closed before making a network request when writes are disabled", async () => {
    const fetcher = vi.fn();
    const executor = new KeeperHubDirectExecutor({
      apiKey: "kh_test",
      fetcher,
      writesEnabled: false,
    });

    await expect(executor.submitPresignature(REQUEST, "key-1")).rejects.toThrow(
      "disabled",
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("sends the simulated contract body once with an idempotency key", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      json: async () => ({ executionId: "direct_123", status: "completed" }),
      ok: true,
      status: 202,
    });
    const executor = new KeeperHubDirectExecutor({
      apiKey: "kh_test",
      baseUrl: "https://keeperhub.test",
      fetcher,
      writesEnabled: true,
    });

    await expect(
      executor.submitPresignature(REQUEST, "key-1"),
    ).resolves.toEqual({
      executionId: "direct_123",
      idempotentReplay: false,
      status: "completed",
    });
    expect(fetcher).toHaveBeenCalledWith(
      "https://keeperhub.test/api/execute/contract-call",
      expect.objectContaining({
        headers: expect.objectContaining({ "Idempotency-Key": "key-1" }),
      }),
    );
    const body = JSON.parse(fetcher.mock.calls[0]?.[1].body as string);
    expect(body).not.toHaveProperty("simulate");
    expect(body.functionName).toBe("setPreSignature");
  });
});
