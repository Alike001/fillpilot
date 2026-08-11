import { OrderStatus } from "@cowprotocol/sdk-order-book";
import { describe, expect, it } from "vitest";

import { toFillPilotOrderState } from "./cow-order-state";

describe("CoW order status mapping", () => {
  it("keeps pending and open orders eligible for checkpoint inspection", () => {
    expect(toFillPilotOrderState(OrderStatus.PRESIGNATURE_PENDING)).toBe(
      "OPEN",
    );
    expect(toFillPilotOrderState(OrderStatus.OPEN)).toBe("OPEN");
  });

  it("maps each terminal CoW state without inventing a local state", () => {
    expect(toFillPilotOrderState(OrderStatus.FULFILLED)).toBe("FULFILLED");
    expect(toFillPilotOrderState(OrderStatus.CANCELLED)).toBe("CANCELLED");
    expect(toFillPilotOrderState(OrderStatus.EXPIRED)).toBe("EXPIRED");
  });

  it("fails closed for an unexpected upstream status", () => {
    expect(() => toFillPilotOrderState("new-status" as OrderStatus)).toThrow(
      /unsupported/i,
    );
  });
});
