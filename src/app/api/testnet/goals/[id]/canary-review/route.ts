import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { parseServerEnv, requireEthereumSepoliaReadReady } from "@/env";
import { readOAuthAttempt } from "@/server/connections/oauth-attempt-store";
import {
  CONNECTION_COOKIE,
  openConnectionSession,
} from "@/server/connections/session-cookie";
import { readLatestSimulationForWallet } from "@/server/db/repository";
import { executionNetwork } from "@/server/integrations/execution-network";
import { buildTestnetCanaryReviewFromEvidence } from "@/server/integrations/testnet-canary-review";

export const runtime = "nodejs";

/**
 * Returns a saved, simulated Sepolia authorization for human review only.
 * This route has no KeeperHub write adapter and always reports writes disabled.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/testnet/goals/[id]/canary-review">,
) {
  const network = executionNetwork("ethereum-sepolia");
  try {
    requireEthereumSepoliaReadReady(parseServerEnv());
    const { id } = await context.params;
    const attemptId = openConnectionSession<string>(
      (await cookies()).get(CONNECTION_COOKIE)?.value,
    );
    const auth = attemptId ? await readOAuthAttempt(attemptId) : undefined;
    if (!auth?.walletAddress) {
      return NextResponse.json(
        {
          error: "Connect KeeperHub before reviewing a testnet canary.",
          writesEnabled: false,
        },
        { status: 401 },
      );
    }

    const evidence = await readLatestSimulationForWallet({
      goalId: id,
      walletAddress: auth.walletAddress,
      chainId: network.chainId,
    });
    if (!evidence) {
      return NextResponse.json(
        {
          error:
            "No successful Ethereum Sepolia simulation exists for this connected goal.",
          writesEnabled: false,
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      review: buildTestnetCanaryReviewFromEvidence(evidence),
      writesEnabled: false,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Testnet canary review is unavailable.",
        writesEnabled: false,
      },
      { status: 409 },
    );
  }
}
