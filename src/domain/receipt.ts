import { createHash } from "node:crypto";

import type { CheckpointDecision } from "./checkpoint";
import type { HexHash } from "./types";

type CanonicalValue =
  | null
  | boolean
  | number
  | string
  | CanonicalValue[]
  | { readonly [key: string]: CanonicalValue };

export type DecisionReceipt<Input> = {
  readonly explanation: string;
  readonly inputHash: HexHash;
  readonly inputs: Input;
  readonly output: CheckpointDecision["action"];
  readonly ruleVersion: string;
};

export function canonicalJson(value: unknown): string {
  return JSON.stringify(normalize(value));
}

export function hashInputs(value: unknown): HexHash {
  return `0x${createHash("sha256").update(canonicalJson(value)).digest("hex")}` as HexHash;
}

export function createDecisionReceipt<Input>(
  inputs: Input,
  decision: CheckpointDecision,
): DecisionReceipt<Input> {
  return {
    explanation: decision.explanation,
    inputHash: hashInputs(inputs),
    inputs,
    output: decision.action,
    ruleVersion: decision.ruleVersion,
  };
}

export function canonicalReceipt<Input>(
  receipt: DecisionReceipt<Input>,
): string {
  return canonicalJson(receipt);
}

function normalize(
  value: unknown,
  seen = new WeakSet<object>(),
): CanonicalValue {
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return value;
  if (typeof value === "bigint") return { $bigint: value.toString() };
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      throw new TypeError("Only finite numbers are canonical");
    return value;
  }
  if (value instanceof Date) return { $date: value.toISOString() };
  if (Array.isArray(value)) return value.map((item) => normalize(item, seen));
  if (typeof value !== "object" || value === undefined) {
    throw new TypeError(
      "Undefined, functions, and symbols are not canonical inputs",
    );
  }
  if (seen.has(value))
    throw new TypeError("Circular values are not canonical inputs");

  seen.add(value);
  const result: Record<string, CanonicalValue> = {};
  for (const key of Object.keys(value).sort()) {
    result[key] = normalize((value as Record<string, unknown>)[key], seen);
  }
  seen.delete(value);
  return result;
}
