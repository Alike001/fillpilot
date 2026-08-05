import { describe, expect, it } from "vitest";
import { COW_PROTOCOL_SETTLEMENT_CONTRACT_ADDRESS } from "@cowprotocol/sdk-config";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

const forkRpcUrl =
  process.env.BASE_FORK_LOCAL_URL ?? process.env.BASE_FORK_RPC_URL;
const describeWithFork = forkRpcUrl ? describe : describe.skip;

describeWithFork("Base fork gate", () => {
  const client = createPublicClient({
    chain: base,
    transport: http(forkRpcUrl),
  });

  it("is Base and contains CoW's deployed settlement contract", async () => {
    expect(forkRpcUrl).toMatch(/^https?:\/\//);
    expect(await client.getChainId()).toBe(base.id);

    const bytecode = await client.getCode({
      address: COW_PROTOCOL_SETTLEMENT_CONTRACT_ADDRESS[
        base.id
      ] as `0x${string}`,
    });
    expect(bytecode).toMatch(/^0x[0-9a-f]+$/i);
    expect(bytecode?.length).toBeGreaterThan(2);
  });
});
