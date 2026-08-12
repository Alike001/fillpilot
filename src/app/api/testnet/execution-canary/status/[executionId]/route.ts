import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { parseServerEnv, requireKeeperHubApiKey } from "@/env";
import { readOAuthAttempt } from "@/server/connections/oauth-attempt-store";
import {
  CONNECTION_COOKIE,
  openConnectionSession,
} from "@/server/connections/session-cookie";
import { KeeperHubStatusReader } from "@/server/integrations/keeperhub-status-reader";

export const runtime = "nodejs";

/** Reads an execution the active KeeperHub organization just submitted. */
export async function GET(
  _request: Request,
  context: RouteContext<"/api/testnet/execution-canary/status/[executionId]">,
) {
  try {
    const attemptId = openConnectionSession<string>(
      (await cookies()).get(CONNECTION_COOKIE)?.value,
    );
    const auth = attemptId ? await readOAuthAttempt(attemptId) : undefined;
    if (!auth?.walletAddress) {
      return NextResponse.json(
        { error: "Connect KeeperHub before checking the canary execution." },
        { status: 401 },
      );
    }

    const { executionId } = await context.params;
    if (!/^direct_[a-zA-Z0-9_-]+$/.test(executionId)) {
      return NextResponse.json(
        { error: "Invalid KeeperHub execution ID." },
        { status: 400 },
      );
    }

    const apiKey = requireKeeperHubApiKey(parseServerEnv());
    const status = await new KeeperHubStatusReader({ apiKey }).getStatus(
      executionId,
    );
    return NextResponse.json({
      status,
      boundary:
        "Status read only. This cannot submit, retry, approve, deploy, place a CoW order, or send another transaction.",
    });
  } catch {
    return NextResponse.json(
      { error: "KeeperHub execution status could not be read." },
      { status: 502 },
    );
  }
}
