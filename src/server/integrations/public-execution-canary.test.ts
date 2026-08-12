import { describe, expect, it, vi } from "vitest";
import {
  buildPublicExecutionCanaryReview,
  PUBLIC_BASE_SEPOLIA_EXECUTION_CANARY,
  simulatePublicExecutionCanary,
  verifyPublicExecutionCanary,
} from "./public-execution-canary";

const pinnedRuntimeCode =
  "0x6080604052348015600e575f80fd5b50600436106026575f3560e01c806333d425c414602a575b5f80fd5b603960353660046075565b603b565b005b604051468152819033907f4947ef22330e8e81cdedf82c33d366e9c942511f5edf79140686b33af9de7f339060200160405180910390a350565b5f602082840312156084575f80fd5b503591905056" as const;

describe("verifyPublicExecutionCanary", () => {
  it("prepares one deterministic zero-value ping for human review", () => {
    const review = buildPublicExecutionCanaryReview();

    expect(review).toMatchObject({
      chainId: 84532,
      contract: PUBLIC_BASE_SEPOLIA_EXECUTION_CANARY.contract,
      function: "ping(bytes32)",
      value: "0",
    });
    expect(review.calldata).toMatch(/^0x33d425c4[0-9a-f]{64}$/);
    expect(review.boundary).toContain("Review only");
  });

  it("accepts the pinned Base Sepolia runtime code", async () => {
    const check = await verifyPublicExecutionCanary(
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            result: pinnedRuntimeCode,
          }),
          { status: 200 },
        ),
      ) as unknown as typeof fetch,
    );

    expect(check).toEqual({
      status: "verified-external-canary",
      observedCodeHash: PUBLIC_BASE_SEPOLIA_EXECUTION_CANARY.runtimeCodeHash,
    });
  });

  it("fails closed when the RPC does not return contract code", async () => {
    const check = await verifyPublicExecutionCanary(
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x" }), {
          status: 200,
        }),
      ) as unknown as typeof fetch,
    );

    expect(check).toEqual({
      status: "unavailable-external-canary",
      reason: "Base Sepolia canary code read failed with HTTP 200.",
    });
  });

  it("asks KeeperHub to simulate the exact reviewed zero-value ping", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          status: "simulated",
          gasEstimate: "48504",
        }),
        { status: 200 },
      ),
    );

    await expect(
      simulatePublicExecutionCanary("kh_test_123", fetcher),
    ).resolves.toEqual({ status: "simulated", gasEstimate: 48504n });

    const [, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toMatchObject({
      contractAddress: PUBLIC_BASE_SEPOLIA_EXECUTION_CANARY.contract,
      chainId: 84532,
      functionName: "ping",
      simulate: true,
    });
    expect(init.headers).not.toHaveProperty("Idempotency-Key");
  });
});
