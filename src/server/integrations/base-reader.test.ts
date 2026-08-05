import { getAddress, isAddress } from "viem";
import { describe, expect, it } from "vitest";

import { BASE_USDC } from "./base-reader";

describe("Base reader constants", () => {
  it("uses a checksum-valid Base USDC contract address", () => {
    expect(isAddress(BASE_USDC)).toBe(true);
    expect(getAddress(BASE_USDC)).toBe(BASE_USDC);
  });
});
