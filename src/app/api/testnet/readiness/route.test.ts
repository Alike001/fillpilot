import { afterEach, describe, expect, it } from "vitest";

import { GET } from "./route";

const originalNetwork = process.env.EXECUTION_NETWORK;
const originalRpc = process.env.SEPOLIA_RPC_URL;
const originalWrites = process.env.ENABLE_TESTNET_WRITES;

afterEach(() => {
  if (originalNetwork === undefined) delete process.env.EXECUTION_NETWORK;
  else process.env.EXECUTION_NETWORK = originalNetwork;
  if (originalRpc === undefined) delete process.env.SEPOLIA_RPC_URL;
  else process.env.SEPOLIA_RPC_URL = originalRpc;
  if (originalWrites === undefined) delete process.env.ENABLE_TESTNET_WRITES;
  else process.env.ENABLE_TESTNET_WRITES = originalWrites;
});

describe("GET /api/testnet/readiness", () => {
  it("reports the inactive safe default without exposing a write action", async () => {
    delete process.env.EXECUTION_NETWORK;
    delete process.env.SEPOLIA_RPC_URL;
    delete process.env.ENABLE_TESTNET_WRITES;

    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        chainId: 11_155_111,
        status: "not-configured",
        writesEnabled: false,
      }),
    );
  });

  it("reports read readiness without treating the write flag as enabled", async () => {
    process.env.EXECUTION_NETWORK = "ethereum-sepolia";
    process.env.SEPOLIA_RPC_URL = "https://sepolia.example.test";
    process.env.ENABLE_TESTNET_WRITES = "true";

    const response = await GET();
    await expect(response.json()).resolves.toEqual({
      chainId: 11_155_111,
      network: "Ethereum Sepolia",
      status: "configured",
      writesEnabled: false,
    });
  });
});
