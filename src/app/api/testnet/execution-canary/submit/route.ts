import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  parseServerEnv,
  requireKeeperHubApiKey,
  requireTestnetWritesEnabled,
} from "@/env";
import { readOAuthAttempt } from "@/server/connections/oauth-attempt-store";
import {
  CONNECTION_COOKIE,
  openConnectionSession,
} from "@/server/connections/session-cookie";
import {
  submitPublicExecutionCanary,
  verifyPublicExecutionCanary,
} from "@/server/integrations/public-execution-canary";

export const runtime = "nodejs";

/**
 * Broadcasts exactly one previously reviewed zero-value testnet ping. The
 * server gate and stable idempotency key prevent an accidental second write.
 */
export async function POST() {
  try {
    const env = parseServerEnv();
    requireTestnetWritesEnabled(env);
    const attemptId = openConnectionSession<string>(
      (await cookies()).get(CONNECTION_COOKIE)?.value,
    );
    const connection = attemptId
      ? await readOAuthAttempt(attemptId)
      : undefined;
    if (!connection?.walletAddress) {
      return NextResponse.json(
        { error: "Connect KeeperHub before submitting the public canary." },
        { status: 401 },
      );
    }
    const check = await verifyPublicExecutionCanary();
    if (check.status !== "verified-external-canary") {
      return NextResponse.json({ error: check.reason }, { status: 409 });
    }
    const submission = await submitPublicExecutionCanary(
      requireKeeperHubApiKey(env),
      env.ENABLE_TESTNET_WRITES,
    );
    return NextResponse.json({
      submission,
      observedCodeHash: check.observedCodeHash,
      boundary:
        "KeeperHub accepted the approved zero-value public-canary request. Poll its execution status before claiming a transaction or event exists.",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Public-canary submission failed.";
    return NextResponse.json(
      { error: message },
      { status: message.includes("disabled") ? 403 : 502 },
    );
  }
}
