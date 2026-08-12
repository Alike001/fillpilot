import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { parseServerEnv, requireKeeperHubApiKey } from "@/env";
import { readOAuthAttempt } from "@/server/connections/oauth-attempt-store";
import {
  CONNECTION_COOKIE,
  openConnectionSession,
} from "@/server/connections/session-cookie";
import {
  simulatePublicExecutionCanary,
  verifyPublicExecutionCanary,
} from "@/server/integrations/public-execution-canary";

export const runtime = "nodejs";

/** Simulates the verified canary only. It has no submit path. */
export async function POST() {
  try {
    const attemptId = openConnectionSession<string>(
      (await cookies()).get(CONNECTION_COOKIE)?.value,
    );
    const connection = attemptId
      ? await readOAuthAttempt(attemptId)
      : undefined;
    if (!connection?.walletAddress) {
      return NextResponse.json(
        { error: "Connect KeeperHub before simulating the public canary." },
        { status: 401 },
      );
    }
    const check = await verifyPublicExecutionCanary();
    if (check.status !== "verified-external-canary") {
      return NextResponse.json(
        { error: check.reason, writesEnabled: false },
        { status: 409 },
      );
    }
    const simulation = await simulatePublicExecutionCanary(
      requireKeeperHubApiKey(parseServerEnv()),
    );
    return NextResponse.json({
      simulation:
        simulation.status === "simulated"
          ? { ...simulation, gasEstimate: simulation.gasEstimate.toString() }
          : simulation,
      observedCodeHash: check.observedCodeHash,
      writesEnabled: false,
      boundary:
        "KeeperHub simulated the exact public-canary ping only. No contract was deployed, token approved, CoW order placed, signature created, or transaction sent.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Public-canary simulation is unavailable.",
        writesEnabled: false,
      },
      { status: 502 },
    );
  }
}
