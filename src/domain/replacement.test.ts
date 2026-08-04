import { describe, expect, it } from "vitest";

import { transitionReplacement } from "./replacement";

describe("replacement state machine", () => {
  it("never posts a new order before confirmed old-order invalidation", () => {
    const presigned = transitionReplacement("NONE", "CONFIRM_NEW_PRESIGN");

    expect(() => transitionReplacement(presigned, "POST_NEW_ORDER")).toThrow(
      /Cannot/,
    );
    const invalidated = transitionReplacement(
      presigned,
      "CONFIRM_OLD_INVALIDATION",
    );
    expect(transitionReplacement(invalidated, "POST_NEW_ORDER")).toBe("POSTED");
  });

  it("allows compensation only for an unused new pre-signature", () => {
    expect(
      transitionReplacement("NEW_PRESIGN_CONFIRMED", "CLEAN_UP_UNUSED_PRESIGN"),
    ).toBe("COMPENSATED");
    expect(() =>
      transitionReplacement("OLD_INVALIDATED", "CLEAN_UP_UNUSED_PRESIGN"),
    ).toThrow(/Cannot/);
  });
});
