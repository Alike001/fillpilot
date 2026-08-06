import { describe, expect, it, vi } from "vitest";
import { encodeFunctionData } from "viem";

import {
  cowPresignAbi,
  KeeperHubDirectSimulator,
} from "./keeperhub-direct-simulator";

const ORDER_UID = `0x${"ab".repeat(56)}` as `0x${string}`;
const REQUEST = {
  goalId: "goal-1",
  orderUid: ORDER_UID,
  to: "0x9008D19f58AAbD9eD0D60971565AA8510560ab41" as const,
  data: encodeFunctionData({
    abi: cowPresignAbi,
    functionName: "setPreSignature",
    args: [ORDER_UID, true],
  }),
};

function response(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("KeeperHub direct contract-call simulator", () => {
  it("sends only a strict simulation request for CoW pre-signature", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      response(200, {
        success: true,
        status: "simulated",
        gasEstimate: "65000",
        wouldRevert: false,
      }),
    );
    const simulator = new KeeperHubDirectSimulator({
      apiKey: "kh_test_only",
      baseUrl: "https://keeperhub.test",
      fetcher,
    });

    await expect(simulator.simulate(REQUEST)).resolves.toEqual({
      status: "simulated",
      gasEstimate: 65_000n,
    });
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://keeperhub.test/api/execute/contract-call");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual(
      expect.objectContaining({ Authorization: "Bearer kh_test_only" }),
    );
    expect(JSON.parse(String(init.body))).toEqual({
      contractAddress: REQUEST.to,
      chainId: 8453,
      functionName: "setPreSignature",
      functionArgs: JSON.stringify([ORDER_UID, true]),
      abi: JSON.stringify(cowPresignAbi),
      simulate: true,
    });
  });

  it("returns a rejected result when KeeperHub reports a would-revert", async () => {
    const simulator = new KeeperHubDirectSimulator({
      apiKey: "kh_test_only",
      fetcher: vi.fn().mockResolvedValue(
        response(400, {
          success: false,
          status: "simulated",
          wouldRevert: true,
          revertReason: "Error(ERC20: insufficient allowance)",
        }),
      ),
    });

    await expect(simulator.simulate(REQUEST)).resolves.toEqual({
      status: "rejected",
      reason: "Error(ERC20: insufficient allowance)",
    });
  });

  it("rejects calldata that cannot be the intended pre-signature operation", async () => {
    const fetcher = vi.fn();
    const simulator = new KeeperHubDirectSimulator({
      apiKey: "kh_test_only",
      fetcher,
    });

    await expect(
      simulator.simulate({ ...REQUEST, data: "0x1234" }),
    ).rejects.toThrow("does not match");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
