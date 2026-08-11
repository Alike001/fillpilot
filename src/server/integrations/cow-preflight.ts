import {
  OrderBookApi,
  OrderQuoteSideKindSell,
  PriceQuality,
  SigningScheme,
  type OrderQuoteRequest,
  type OrderQuoteResponse,
} from "@cowprotocol/sdk-order-book";
import type { Address } from "@cowprotocol/sdk-config";

import {
  executionNetwork,
  type ExecutionNetworkProfile,
} from "./execution-network";

export type CowPreflightInput = {
  readonly owner: Address;
  readonly sellAmount: bigint;
  readonly minimumBuyAmount: bigint;
  readonly deadline: Date;
};

export type CowPreflight = {
  readonly buyAmount: bigint;
  readonly quoteExpiresAt: Date;
  readonly validTo: number;
  readonly verified: boolean;
};

export type CowPreflightError =
  | "quote-expired"
  | "quote-malformed"
  | "quote-unverified"
  | "quote-below-floor";

type QuoteApi = Pick<OrderBookApi, "getQuote">;

export function createCowQuoteApi(
  network: ExecutionNetworkProfile = executionNetwork(),
): QuoteApi {
  return new OrderBookApi({
    chainId: network.cowChainId,
    env: network.cowEnvironment,
  });
}

export async function getCowPreflight(
  input: CowPreflightInput,
  api: QuoteApi | undefined = undefined,
  now = new Date(),
  network: ExecutionNetworkProfile = executionNetwork(),
): Promise<CowPreflight> {
  const response = await getValidatedCowQuote(input, api, now, network);
  return validateCowPreflight(
    response,
    input,
    Math.floor(input.deadline.getTime() / 1000),
    now,
    network,
  );
}

export async function getValidatedCowQuote(
  input: CowPreflightInput,
  api: QuoteApi | undefined = undefined,
  now = new Date(),
  network: ExecutionNetworkProfile = executionNetwork(),
): Promise<OrderQuoteResponse> {
  const validTo = Math.floor(input.deadline.getTime() / 1000);
  if (
    !Number.isSafeInteger(validTo) ||
    validTo <= Math.floor(now.getTime() / 1000)
  ) {
    throw new Error("quote-expired" satisfies CowPreflightError);
  }

  const response = await (api ?? createCowQuoteApi(network)).getQuote({
    kind: OrderQuoteSideKindSell.SELL,
    sellToken: network.sellToken,
    buyToken: network.buyToken,
    sellAmountBeforeFee: input.sellAmount.toString(),
    from: input.owner,
    receiver: input.owner,
    validTo,
    priceQuality: PriceQuality.VERIFIED,
    signingScheme: SigningScheme.PRESIGN,
  } satisfies OrderQuoteRequest);

  validateCowPreflight(response, input, validTo, now, network);
  return response;
}

export function validateCowPreflight(
  response: OrderQuoteResponse,
  input: CowPreflightInput,
  requestedValidTo: number,
  now = new Date(),
  network: ExecutionNetworkProfile = executionNetwork(),
): CowPreflight {
  const quoteExpiresAt = new Date(response.expiration);
  const quote = response.quote;
  if (
    !response.verified ||
    !Number.isFinite(quoteExpiresAt.getTime()) ||
    quoteExpiresAt <= now ||
    quote.sellToken.toLowerCase() !== network.sellToken.toLowerCase() ||
    quote.buyToken.toLowerCase() !== network.buyToken.toLowerCase() ||
    quote.validTo > requestedValidTo ||
    (response.from && response.from.toLowerCase() !== input.owner.toLowerCase())
  ) {
    throw new Error(
      !response.verified ? "quote-unverified" : "quote-malformed",
    );
  }

  let buyAmount: bigint;
  try {
    buyAmount = BigInt(quote.buyAmount);
  } catch {
    throw new Error("quote-malformed" satisfies CowPreflightError);
  }
  if (buyAmount < input.minimumBuyAmount) {
    throw new Error("quote-below-floor" satisfies CowPreflightError);
  }

  return {
    buyAmount,
    quoteExpiresAt,
    validTo: quote.validTo,
    verified: response.verified,
  };
}
