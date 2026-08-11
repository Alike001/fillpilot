import { OrderStatus } from "@cowprotocol/sdk-order-book";

import type { OrderState } from "@/domain/goal";

/**
 * CoW order-book states are external input. FillPilot accepts only the states
 * required by its checkpoint policy and rejects unknown values before a
 * worker can make a decision from them.
 */
export function toFillPilotOrderState(status: OrderStatus): OrderState {
  switch (status) {
    case OrderStatus.PRESIGNATURE_PENDING:
    case OrderStatus.OPEN:
      return "OPEN";
    case OrderStatus.FULFILLED:
      return "FULFILLED";
    case OrderStatus.CANCELLED:
      return "CANCELLED";
    case OrderStatus.EXPIRED:
      return "EXPIRED";
    default:
      throw new Error(`Unsupported CoW order status: ${status as string}`);
  }
}
