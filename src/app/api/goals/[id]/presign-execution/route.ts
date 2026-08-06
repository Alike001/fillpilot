import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import {
  parseServerEnv,
  requireKeeperHubApiKey,
  requireMainnetWritesEnabled,
} from "@/env";
import { readOAuthAttempt } from "@/server/connections/oauth-attempt-store";
import {
  CONNECTION_COOKIE,
  openConnectionSession,
} from "@/server/connections/session-cookie";
import {
  readGoalForWallet,
  recordSubmittedExecution,
} from "@/server/db/repository";
import { buildPresignOrder } from "@/server/integrations/cow-order";
import { getValidatedCowQuote } from "@/server/integrations/cow-preflight";
import { buildPresignSimulationRequest } from "@/server/integrations/cow-presign-simulation";
import { KeeperHubDirectExecutor } from "@/server/integrations/keeperhub-direct-executor";
import { KeeperHubDirectSimulator } from "@/server/integrations/keeperhub-direct-simulator";
import { simulateOnly } from "@/server/integrations/keeperhub-simulation";

export const runtime = "nodejs";

/**
 * This route is intentionally server-gated. It cannot write unless the
 * separate operator flag is set; every accepted request re-simulates the same
 * payload immediately before it asks KeeperHub to execute once.
 */
export async function POST(
  _request: NextRequest,
  context: RouteContext<"/api/goals/[id]/presign-execution">,
) {
  try {
    const env = parseServerEnv();
    requireMainnetWritesEnabled(env);
    const { id } = await context.params;
    const attemptId = openConnectionSession<string>(
      (await cookies()).get(CONNECTION_COOKIE)?.value,
    );
    const auth = attemptId ? await readOAuthAttempt(attemptId) : undefined;
    if (!auth?.walletAddress) {
      return NextResponse.json(
        { error: "Connect KeeperHub before authorizing a pre-signature." },
        { status: 401 },
      );
    }
    const goal = await readGoalForWallet(id, auth.walletAddress);
    if (!goal || goal.state !== "DRAFT") {
      return NextResponse.json(
        { error: "Only a connected draft goal can be authorized." },
        { status: 409 },
      );
    }

    const apiKey = requireKeeperHubApiKey(env);
    const input = {
      owner: auth.walletAddress,
      sellAmount: BigInt(goal.sellAmount),
      minimumBuyAmount: BigInt(goal.minimumBuyAmount),
      deadline: goal.deadline,
    } as const;
    const quote = await getValidatedCowQuote(input);
    const order = await buildPresignOrder(input, quote);
    const executionRequest = buildPresignSimulationRequest(goal.id, order);
    const simulation = await simulateOnly(
      new KeeperHubDirectSimulator({ apiKey }),
      executionRequest,
    );
    if (simulation.status !== "simulated") {
      return NextResponse.json(
        {
          error: `KeeperHub rejected the exact pre-signature simulation: ${simulation.reason}`,
        },
        { status: 409 },
      );
    }

    const idempotencyKey = `presign:${order.uid}`;
    const submitted = await new KeeperHubDirectExecutor({
      apiKey,
      writesEnabled: env.ENABLE_MAINNET_WRITES,
    }).submitPresignature(executionRequest, idempotencyKey);
    await recordSubmittedExecution({
      executionId: submitted.executionId,
      goalId: goal.id,
      idempotencyKey,
      operation: "presign",
      simulation: {
        gasEstimate: simulation.gasEstimate.toString(),
        orderUid: order.uid,
        status: "simulated",
      },
    });
    return NextResponse.json({
      executionId: submitted.executionId,
      idempotentReplay: submitted.idempotentReplay,
      orderUid: order.uid,
      status: submitted.status,
      boundary:
        "KeeperHub accepted this pre-signature execution. It is not confirmed until its status record includes a verified transaction receipt.",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Pre-signature execution failed.";
    const disabled = message.includes("Mainnet writes are disabled");
    return NextResponse.json(
      { error: message },
      { status: disabled ? 403 : 502 },
    );
  }
}
