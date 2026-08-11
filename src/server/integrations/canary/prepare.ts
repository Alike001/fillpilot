import { createHash } from "node:crypto";
import { encodeFunctionData, parseAbi } from "viem";

const abi = parseAbi(["function record(bytes32 goalId, bytes32 evidenceId)"]);

export function prepareCanaryRecord(goalId: string, contract: `0x${string}`) {
  const goalHash =
    `0x${createHash("sha256").update(goalId).digest("hex")}` as `0x${string}`;
  const evidenceId =
    `0x${createHash("sha256").update(`fillpilot-canary:${goalId}`).digest("hex")}` as `0x${string}`;
  return {
    to: contract,
    value: "0",
    goalHash,
    evidenceId,
    data: encodeFunctionData({
      abi,
      functionName: "record",
      args: [goalHash, evidenceId],
    }),
  };
}
