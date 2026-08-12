import { describe, expect, it, vi } from "vitest";
import {
  PUBLIC_BASE_SEPOLIA_EXECUTION_CANARY,
  verifyPublicExecutionCanary,
} from "./public-execution-canary";

const pinnedRuntimeCode =
  "0x6080604052348015600e575f80fd5b50600436106026575f3560e01c806333d425c414602a575b5f80fd5b603960353660046075565b603b565b005b604051468152819033907f4947ef22330e8e81cdedf82c33d366e9c942511f5edf79140686b33af9de7f339060200160405180910390a350565b5f602082840312156084575f80fd5b503591905056" as const;

describe("verifyPublicExecutionCanary", () => {
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
});
