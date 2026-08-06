import { describe, expect, it, vi } from "vitest";

import { simulateAndRecord, simulateOnly } from "./keeperhub-simulation";

const REQUEST = {
  goalId: "goal-1",
  orderUid: `0x${"ab".repeat(56)}` as `0x${string}`,
  to: "0x9008D19f58AAbD9eD0D60971565AA8510560ab41" as const,
  data: "0x1234" as const,
};

describe("KeeperHub simulation boundary", () => {
  it("calls only the simulator and returns its evidence", async () => {
    const simulate = vi
      .fn()
      .mockResolvedValue({ status: "simulated", gasEstimate: 42_000n });
    await expect(simulateOnly({ simulate }, REQUEST)).resolves.toEqual({
      status: "simulated",
      gasEstimate: 42_000n,
    });
    expect(simulate).toHaveBeenCalledOnce();
    expect(simulate).toHaveBeenCalledWith(REQUEST);
  });

  it("rejects malformed inputs before any simulator call", async () => {
    const simulate = vi.fn();
    await expect(
      simulateOnly({ simulate }, { ...REQUEST, data: "0x" }),
    ).rejects.toThrow("calldata");
    expect(simulate).not.toHaveBeenCalled();
  });

  it("records the simulated result with a UID-derived idempotency key", async () => {
    const simulate = vi
      .fn()
      .mockResolvedValue({ status: "rejected", reason: "allowance missing" });
    const record = vi.fn().mockResolvedValue(undefined);
    await expect(
      simulateAndRecord({ simulate }, { record }, REQUEST),
    ).resolves.toEqual({ status: "rejected", reason: "allowance missing" });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        goalId: REQUEST.goalId,
        idempotencyKey: `simulation:${REQUEST.orderUid}`,
        operation: "presign",
      }),
    );
  });

  it("serializes bigint gas evidence before a database recorder sees it", async () => {
    const record = vi.fn().mockResolvedValue(undefined);
    await simulateAndRecord(
      {
        simulate: vi
          .fn()
          .mockResolvedValue({ status: "simulated", gasEstimate: 65_000n }),
      },
      { record },
      REQUEST,
    );

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        simulation: { status: "simulated", gasEstimate: "65000" },
      }),
    );
  });
});
