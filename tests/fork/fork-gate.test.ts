import { describe, expect, it } from "vitest";

const forkRpcUrl = process.env.BASE_FORK_RPC_URL;
const describeWithFork = forkRpcUrl ? describe : describe.skip;

describeWithFork("Base fork gate", () => {
  it("requires an explicit Base RPC URL before contract tests run", () => {
    expect(forkRpcUrl).toMatch(/^https?:\/\//);
  });
});
