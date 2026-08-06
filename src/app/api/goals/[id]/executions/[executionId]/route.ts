import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { parseServerEnv, requireKeeperHubApiKey } from "@/env";
import { readOAuthAttempt } from "@/server/connections/oauth-attempt-store";
import {
  CONNECTION_COOKIE,
  openConnectionSession,
} from "@/server/connections/session-cookie";
import {
  applyExecutionReconciliation,
  readExecutionForWallet,
} from "@/server/db/repository";
import { reconcileKeeperHubExecution } from "@/server/integrations/keeperhub-execution-reconciliation";
import { KeeperHubStatusReader } from "@/server/integrations/keeperhub-status-reader";

export const runtime = "nodejs";

/** Reads a known FillPilot execution; it never creates or retries an execution. */
export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/goals/[id]/executions/[executionId]">,
) {
  try {
    const { id, executionId } = await context.params;
    const attemptId = openConnectionSession<string>(
      (await cookies()).get(CONNECTION_COOKIE)?.value,
    );
    const auth = attemptId ? await readOAuthAttempt(attemptId) : undefined;
    if (!auth?.walletAddress) {
      return NextResponse.json(
        { error: "Connect KeeperHub before checking execution status." },
        { status: 401 },
      );
    }

    const stored = await readExecutionForWallet({
      goalId: id,
      executionId,
      walletAddress: auth.walletAddress,
    });
    if (!stored?.executionId) {
      return NextResponse.json(
        { error: "Execution not found." },
        { status: 404 },
      );
    }

    let apiKey: string;
    try {
      apiKey = requireKeeperHubApiKey(parseServerEnv());
    } catch {
      return NextResponse.json(
        { error: "Execution status is not configured on this server." },
        { status: 503 },
      );
    }

    const reconciliation = await reconcileKeeperHubExecution(
      new KeeperHubStatusReader({ apiKey }),
      stored.executionId,
    );
    const saved = await applyExecutionReconciliation(stored.id, reconciliation);
    return NextResponse.json({
      state: reconciliation.state,
      executionId: reconciliation.executionId,
      transactionHash:
        reconciliation.state === "CONFIRMED"
          ? reconciliation.transactionHash
          : undefined,
      transactionLink:
        reconciliation.state === "CONFIRMED"
          ? reconciliation.transactionLink
          : undefined,
      persisted: Boolean(saved),
      boundary:
        "Status read only. No KeeperHub execution, retry, order, approval, or transaction was created.",
    });
  } catch {
    return NextResponse.json(
      { error: "Execution status could not be read." },
      { status: 502 },
    );
  }
}
