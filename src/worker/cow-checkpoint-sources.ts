import { readCowOrder } from "@/server/integrations/cow-reader";
import { getCowPreflight } from "@/server/integrations/cow-preflight";
import { timestampMs, tokenAmount } from "@/domain/types";

import type {
  CowOrderStatusSource,
  FreshQuoteSource,
  PostedOrderCheckpoint,
} from "./checkpoint-handler";

export class CowOrderStatusReader implements CowOrderStatusSource {
  async read(orderUid: PostedOrderCheckpoint["orderUid"]) {
    return (await readCowOrder(orderUid)).status;
  }
}

export class CowFreshQuoteReader implements FreshQuoteSource {
  async read(context: PostedOrderCheckpoint, now: Date) {
    const quote = await getCowPreflight(
      {
        owner: context.owner,
        sellAmount: context.sellAmount,
        minimumBuyAmount: context.goal.minimumBuyAmount,
        deadline: new Date(Number(context.goal.deadline)),
      },
      undefined,
      now,
    );
    return {
      buyAmount: tokenAmount(quote.buyAmount),
      executable: quote.verified,
      receivedAt: timestampMs(now.getTime()),
      validUntil: timestampMs(quote.quoteExpiresAt.getTime()),
    };
  }
}
