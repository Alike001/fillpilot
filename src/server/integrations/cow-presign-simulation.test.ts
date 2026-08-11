import { describe, expect, it } from "vitest";

import { buildPresignSimulationRequest } from "./cow-presign-simulation";

describe("CoW pre-signature simulation request", () => {
  it("encodes only the canonical order UID and true authorization flag", () => {
    const request = buildPresignSimulationRequest("goal-1", {
      order: {} as never,
      owner: "0x1111111111111111111111111111111111111111",
      settlement: "0x9008D19f58AAbD9eD0D60971565AA8510560ab41",
      uid: `0x${"ab".repeat(56)}`,
    });

    expect(request.chainId).toBe(8453);

    expect(request).toMatchObject({
      goalId: "goal-1",
      orderUid: `0x${"ab".repeat(56)}`,
      to: "0x9008D19f58AAbD9eD0D60971565AA8510560ab41",
    });
    expect(request.data).not.toBe("0x");
  });
});
