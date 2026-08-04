import { describe, expect, it } from "vitest";

import { toCowReadError } from "./cow-reader";

describe("CoW read error mapping", () => {
  it("does not present a malformed request as a terminal order state", () => {
    expect(toCowReadError(new Error("bad request"))).toEqual({
      kind: "unavailable",
      message: "CoW could not be reached.",
    });
  });
});
