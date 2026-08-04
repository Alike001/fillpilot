import { OrderBookApi, OrderBookApiError } from "@cowprotocol/sdk-order-book";
import { SupportedChainId, type Address } from "@cowprotocol/sdk-config";

export type CowReadError = {
  kind: "not-found" | "rate-limited" | "unavailable" | "malformed";
  message: string;
};

export function createCowReader() {
  return new OrderBookApi({ chainId: SupportedChainId.BASE });
}

export async function readCowOrders(owner: Address, api = createCowReader()) {
  return mapCowRead(() => api.getOrders({ owner, limit: 100 }));
}

export async function readCowOrder(
  orderUid: `0x${string}`,
  api = createCowReader(),
) {
  return mapCowRead(() => api.getOrder(orderUid));
}

export async function readCowTrades(
  orderUid: `0x${string}`,
  api = createCowReader(),
) {
  return mapCowRead(() => api.getTrades({ orderUid }));
}

async function mapCowRead<T>(read: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (error) {
    throw toCowReadError(error);
  }
}

export function toCowReadError(error: unknown): CowReadError {
  if (error instanceof OrderBookApiError) {
    if (error.response.status === 404)
      return { kind: "not-found", message: "CoW did not find that order." };
    if (error.response.status === 429)
      return {
        kind: "rate-limited",
        message: "CoW is rate limiting reads; retry later.",
      };
    if (error.response.status >= 500)
      return {
        kind: "unavailable",
        message: "CoW is temporarily unavailable.",
      };
    return { kind: "malformed", message: "CoW rejected the read request." };
  }

  return { kind: "unavailable", message: "CoW could not be reached." };
}
