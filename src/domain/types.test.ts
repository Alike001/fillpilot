import { describe, expect, it } from "vitest";

import {
  executionId,
  hexHash,
  orderUid,
  positiveTokenAmount,
  timestampMs,
  tokenAmount,
} from "./types";

describe("domain value constructors", () => {
  it("preserves arbitrary-precision token amounts", () => {
    expect(tokenAmount(10n ** 70n)).toBe(10n ** 70n);
    expect(positiveTokenAmount(1n)).toBe(1n);
  });

  it("rejects unsafe values before they enter the domain", () => {
    expect(() => tokenAmount(-1n)).toThrow(/negative/);
    expect(() => positiveTokenAmount(0n)).toThrow(/positive/);
    expect(() => timestampMs(Number.MAX_SAFE_INTEGER + 1)).toThrow(
      /safe integers/,
    );
    expect(() => executionId(" ")).toThrow(/required/);
  });

  it("checks external identifiers structurally", () => {
    expect(() => orderUid("0x1234")).toThrow(/Order UID/);
    expect(() => hexHash("0x1234")).toThrow(/Hash/);
  });
});
