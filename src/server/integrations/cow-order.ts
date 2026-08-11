import { OrderSigningUtils } from "@cowprotocol/sdk-order-signing";
import {
  ContractsOrderKind,
  OrderBalance,
} from "@cowprotocol/sdk-contracts-ts";
import { ViemAdapter } from "@cowprotocol/sdk-viem-adapter";
import { setGlobalAdapter } from "@cowprotocol/sdk-common";
import { type Address } from "@cowprotocol/sdk-config";
import type { OrderQuoteResponse } from "@cowprotocol/sdk-order-book";
import { createPublicClient, custom, type PublicClient } from "viem";
import { base } from "viem/chains";

import { validateCowPreflight, type CowPreflightInput } from "./cow-preflight";
import {
  executionNetwork,
  type ExecutionNetworkProfile,
} from "./execution-network";

type ContractsOrder = Parameters<typeof OrderSigningUtils.generateOrderId>[1];

setGlobalAdapter(
  new ViemAdapter({
    provider: createPublicClient({
      chain: base,
      transport: custom({
        request: async () => {
          throw new Error("CoW order UID construction does not use RPC");
        },
      }),
    }) as PublicClient,
  }),
);

export type PresignOrder = {
  readonly order: ContractsOrder;
  readonly owner: Address;
  readonly settlement: Address;
  readonly uid: `0x${string}`;
};

export async function buildPresignOrder(
  input: CowPreflightInput,
  response: OrderQuoteResponse,
  now = new Date(),
  network: ExecutionNetworkProfile = executionNetwork(),
): Promise<PresignOrder> {
  const requestedValidTo = Math.floor(input.deadline.getTime() / 1000);
  validateCowPreflight(response, input, requestedValidTo, now, network);

  const quote = response.quote;
  const appDataHash =
    quote.appDataHash ??
    (/^0x[a-fA-F0-9]{64}$/.test(quote.appData) ? quote.appData : undefined);
  if (
    quote.kind !== "sell" ||
    quote.partiallyFillable ||
    quote.receiver?.toLowerCase() !== input.owner.toLowerCase() ||
    !appDataHash
  ) {
    throw new Error("quote cannot produce FillPilot's protected sell order");
  }

  const order: ContractsOrder = {
    sellToken: quote.sellToken,
    buyToken: quote.buyToken,
    receiver: input.owner,
    sellAmount: quote.sellAmount,
    buyAmount: quote.buyAmount,
    validTo: quote.validTo,
    appData: appDataHash,
    feeAmount: quote.feeAmount,
    kind: ContractsOrderKind.SELL,
    partiallyFillable: false,
    sellTokenBalance: toSellBalance(quote.sellTokenBalance),
    buyTokenBalance: toBuyBalance(quote.buyTokenBalance),
  };
  const { orderId } = await OrderSigningUtils.generateOrderId(
    network.cowChainId,
    order,
    { owner: input.owner },
  );
  const uid = orderId as `0x${string}`;

  if (uid.length !== 114) {
    throw new Error("CoW returned an invalid order UID");
  }

  return { order, owner: input.owner, settlement: network.settlement, uid };
}

function toSellBalance(balance: string | undefined): OrderBalance {
  if (balance === "internal") return OrderBalance.INTERNAL;
  if (balance === "external") return OrderBalance.EXTERNAL;
  return OrderBalance.ERC20;
}

function toBuyBalance(balance: string | undefined): OrderBalance {
  return balance === "internal" ? OrderBalance.INTERNAL : OrderBalance.ERC20;
}
