import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { parseServerEnv, requireKeeperHubApiKey } from "@/env";
import { readOAuthAttempt } from "@/server/connections/oauth-attempt-store";
import {
  CONNECTION_COOKIE,
  openConnectionSession,
} from "@/server/connections/session-cookie";
import {
  readGoalForWallet,
  recordSimulationEvidence,
} from "@/server/db/repository";
import { buildPresignOrder } from "@/server/integrations/cow-order";
import { getValidatedCowQuote } from "@/server/integrations/cow-preflight";
import { buildPresignSimulationRequest } from "@/server/integrations/cow-presign-simulation";
import { KeeperHubDirectSimulator } from "@/server/integrations/keeperhub-direct-simulator";
import { simulateAndRecord } from "@/server/integrations/keeperhub-simulation";

export const runtime = "nodejs";

/** Simulates, but never broadcasts, the exact CoW pre-signature contract call. */
export async function POST(
  _request: NextRequest,
  context: RouteContext<"/api/goals/[id]/presign-simulation">,
) {
  try {
    const { id } = await context.params;
    const attemptId = openConnectionSession<string>(
      (await cookies()).get(CONNECTION_COOKIE)?.value,
    );
    const auth = attemptId ? await readOAuthAttempt(attemptId) : undefined;
    if (!auth?.walletAddress) {
      return NextResponse.json(
        { error: "Connect KeeperHub before simulating a pre-signature." },
        { status: 401 },
      );
    }
    const goal = await readGoalForWallet(id, auth.walletAddress);
    if (!goal || goal.state !== "DRAFT") {
      return NextResponse.json(
        { error: "Only a connected draft goal can be simulated." },
        { status: 409 },
      );
    }

    const apiKey = requireKeeperHubApiKey(parseServerEnv());
    const input = {
      owner: auth.walletAddress,
      sellAmount: BigInt(goal.sellAmount),
      minimumBuyAmount: BigInt(goal.minimumBuyAmount),
      deadline: goal.deadline,
    } as const;
    const quote = await getValidatedCowQuote(input);
    const order = await buildPresignOrder(input, quote);
    const simulation = await simulateAndRecord(
      new KeeperHubDirectSimulator({ apiKey }),
      { record: recordSimulationEvidence },
      buildPresignSimulationRequest(goal.id, order),
    );
    return NextResponse.json({
      orderUid: order.uid,
      simulation:
        simulation.status === "simulated"
          ? { ...simulation, gasEstimate: simulation.gasEstimate.toString() }
          : simulation,
      boundary:
        "KeeperHub simulated this call only. No order, approval, signature, or transaction was created.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Simulation could not run.",
      },
      { status: 502 },
    );
  }
}
