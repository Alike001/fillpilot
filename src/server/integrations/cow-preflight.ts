import {
  OrderBookApi,
  OrderQuoteSideKindSell,
  PriceQuality,
  SigningScheme,
  type OrderQuoteRequest,
  type OrderQuoteResponse,
} from "@cowprotocol/sdk-order-book";
import { SupportedChainId, type Address } from "@cowprotocol/sdk-config";

const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address;
const BASE_WETH = "0x4200000000000000000000000000000000000006" as Address;

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

export function createCowQuoteApi(): QuoteApi {
  return new OrderBookApi({ chainId: SupportedChainId.BASE });
}

export async function getCowPreflight(
  input: CowPreflightInput,
  api = createCowQuoteApi(),
  now = new Date(),
): Promise<CowPreflight> {
  const response = await getValidatedCowQuote(input, api, now);
  return validateCowPreflight(
    response,
    input,
    Math.floor(input.deadline.getTime() / 1000),
    now,
  );
}

export async function getValidatedCowQuote(
  input: CowPreflightInput,
  api = createCowQuoteApi(),
  now = new Date(),
): Promise<OrderQuoteResponse> {
  const validTo = Math.floor(input.deadline.getTime() / 1000);
  if (
    !Number.isSafeInteger(validTo) ||
    validTo <= Math.floor(now.getTime() / 1000)
  ) {
    throw new Error("quote-expired" satisfies CowPreflightError);
  }

  const response = await api.getQuote({
    kind: OrderQuoteSideKindSell.SELL,
    sellToken: BASE_USDC,
    buyToken: BASE_WETH,
    sellAmountBeforeFee: input.sellAmount.toString(),
    from: input.owner,
    receiver: input.owner,
    validTo,
    priceQuality: PriceQuality.VERIFIED,
    signingScheme: SigningScheme.PRESIGN,
  } satisfies OrderQuoteRequest);

  validateCowPreflight(response, input, validTo, now);
  return response;
}

export function validateCowPreflight(
  response: OrderQuoteResponse,
  input: CowPreflightInput,
  requestedValidTo: number,
  now = new Date(),
): CowPreflight {
  const quoteExpiresAt = new Date(response.expiration);
  const quote = response.quote;
  if (
    !response.verified ||
    !Number.isFinite(quoteExpiresAt.getTime()) ||
    quoteExpiresAt <= now ||
    quote.sellToken.toLowerCase() !== BASE_USDC.toLowerCase() ||
    quote.buyToken.toLowerCase() !== BASE_WETH.toLowerCase() ||
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
