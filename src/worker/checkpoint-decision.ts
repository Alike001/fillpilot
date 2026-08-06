import {
  canonicalJson,
  createDecisionReceipt,
  type DecisionReceipt,
} from "@/domain/receipt";
import {
  decideCheckpoint,
  type CheckpointInput,
  type CheckpointDecision,
} from "@/domain/checkpoint";

export type StoredCheckpointDecision = {
  readonly explanation: string;
  readonly inputHash: string;
  readonly inputs: Record<string, unknown>;
  readonly output: string;
  readonly ruleVersion: string;
};

export function evaluateCheckpoint(input: CheckpointInput): {
  readonly decision: CheckpointDecision;
  readonly receipt: DecisionReceipt<CheckpointInput>;
  readonly stored: StoredCheckpointDecision;
} {
  const decision = decideCheckpoint(input);
  const receipt = createDecisionReceipt(input, decision);
  return {
    decision,
    receipt,
    stored: {
      ruleVersion: receipt.ruleVersion,
      inputHash: receipt.inputHash,
      inputs: JSON.parse(canonicalJson(input)) as Record<string, unknown>,
      output: receipt.output,
      explanation: receipt.explanation,
    },
  };
}
