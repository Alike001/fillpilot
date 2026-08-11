import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import { GET } from "./route";

const originalNetwork = process.env.EXECUTION_NETWORK;
const originalRpc = process.env.SEPOLIA_RPC_URL;

afterEach(() => {
  if (originalNetwork === undefined) delete process.env.EXECUTION_NETWORK;
  else process.env.EXECUTION_NETWORK = originalNetwork;
  if (originalRpc === undefined) delete process.env.SEPOLIA_RPC_URL;
  else process.env.SEPOLIA_RPC_URL = originalRpc;
});

describe("GET /api/testnet/goals/[id]/canary-review", () => {
  it("fails closed while Sepolia read readiness is not configured", async () => {
    delete process.env.EXECUTION_NETWORK;
    delete process.env.SEPOLIA_RPC_URL;

    const response = await GET(
      new NextRequest(
        "http://127.0.0.1/api/testnet/goals/goal-1/canary-review",
      ),
      { params: Promise.resolve({ id: "goal-1" }) },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: expect.stringMatching(/not the selected execution network/),
        writesEnabled: false,
      }),
    );
  });
});
