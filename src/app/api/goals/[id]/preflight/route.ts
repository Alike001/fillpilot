import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { readOAuthAttempt } from "@/server/connections/oauth-attempt-store";
import {
  CONNECTION_COOKIE,
  openConnectionSession,
} from "@/server/connections/session-cookie";
import { readGoalForWallet } from "@/server/db/repository";
import { getCowPreflight } from "@/server/integrations/cow-preflight";
import { executionNetworkForGoal } from "@/server/integrations/execution-network";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/goals/[id]/preflight">,
) {
  try {
    const { id } = await context.params;
    const attemptId = openConnectionSession<string>(
      (await cookies()).get(CONNECTION_COOKIE)?.value,
    );
    const auth = attemptId ? await readOAuthAttempt(attemptId) : undefined;
    if (!auth?.walletAddress) {
      return NextResponse.json(
        { error: "Connect KeeperHub before requesting a quote." },
        { status: 401 },
      );
    }
    const goal = await readGoalForWallet(id, auth.walletAddress);
    if (!goal) {
      return NextResponse.json({ error: "Goal not found." }, { status: 404 });
    }
    if (goal.state !== "DRAFT") {
      return NextResponse.json(
        { error: "Only an unarmed draft goal can be preflighted." },
        { status: 409 },
      );
    }
    const profile = executionNetworkForGoal(goal);
    const preflight = await getCowPreflight(
      {
        owner: auth.walletAddress,
        sellAmount: BigInt(goal.sellAmount),
        minimumBuyAmount: BigInt(goal.minimumBuyAmount),
        deadline: goal.deadline,
      },
      undefined,
      new Date(),
      profile,
    );
    return NextResponse.json({
      status: "eligible",
      buyAmount: preflight.buyAmount.toString(),
      quoteExpiresAt: preflight.quoteExpiresAt.toISOString(),
      validTo: preflight.validTo,
      verified: preflight.verified,
      market: {
        network: profile.label,
        buySymbol: profile.buySymbol,
        buyDecimals: profile.buyDecimals,
      },
      boundary:
        "Quote only. No order, approval, KeeperHub execution, or transaction was created.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Quote could not be read.";
    const noLiquidity =
      message === "Not Found" ||
      message.includes("NoLiquidity") ||
      message.includes("no route found");
    const unavailable = message === "fetch failed";
    return NextResponse.json(
      {
        status: "unavailable",
        error: unavailable
          ? "CoW could not be reached for this quote. No order, approval, execution, or transaction was created. Retry after confirming the local server has network access."
          : noLiquidity
            ? "CoW Sepolia has no live liquidity route for this test market. No quote, order, approval, execution, or transaction was created."
            : message,
      },
      { status: unavailable ? 503 : 502 },
    );
  }
}
