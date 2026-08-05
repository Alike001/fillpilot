import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { parseServerEnv } from "@/env";
import { buildConnectionDoctor } from "@/server/connections/doctor";
import { refreshMcpWallet } from "@/server/connections/mcp-oauth";
import {
  readOAuthAttempt,
  saveOAuthAttempt,
} from "@/server/connections/oauth-attempt-store";
import {
  CONNECTION_COOKIE,
  openConnectionSession,
} from "@/server/connections/session-cookie";
import { readBaseWallet } from "@/server/integrations/base-reader";
import {
  COW_PROTOCOL_VAULT_RELAYER_ADDRESS,
  SupportedChainId,
} from "@cowprotocol/sdk-config";

export const runtime = "nodejs";

export async function GET() {
  try {
    const sealed = (await cookies()).get(CONNECTION_COOKIE)?.value;
    if (!sealed) return disconnected("missing-session");

    let attemptId: string | undefined;
    try {
      attemptId = openConnectionSession<string>(sealed);
    } catch {
      return disconnected("missing-session");
    }
    if (!attemptId) return disconnected("missing-session");

    const auth = attemptId ? await readOAuthAttempt(attemptId) : undefined;
    if (!auth) return disconnected("expired-attempt");
    const connected = Boolean(auth?.tokens?.access_token);
    if (connected && attemptId && auth?.redirectUrl && !auth.walletAddress) {
      await within(
        refreshMcpWallet(
          parseServerEnv().KEEPERHUB_MCP_URL,
          auth.redirectUrl,
          auth,
        ),
        10_000,
      );
      await saveOAuthAttempt(attemptId, auth);
    }
    if (!connected || !auth?.walletAddress) {
      const response = NextResponse.json({
        checks: buildConnectionDoctor({
          connection: connected ? "connected" : "disconnected",
          walletAddress: auth?.walletAddress,
        }),
      });
      return response;
    }

    try {
      const balances = await readBaseWallet(
        auth.walletAddress,
        COW_PROTOCOL_VAULT_RELAYER_ADDRESS[
          SupportedChainId.BASE
        ] as `0x${string}`,
      );
      return NextResponse.json({
        checks: buildConnectionDoctor({
          connection: "connected",
          walletAddress: auth.walletAddress,
          chainId: 8453,
          ...balances,
        }),
      });
    } catch {
      return NextResponse.json({
        checks: buildConnectionDoctor({
          connection: "connected",
          walletAddress: auth.walletAddress,
          chainId: 8453,
          baseReadUnavailable: true,
        }),
      });
    }
  } catch {
    return disconnected("expired-attempt");
  }
}

function disconnected(issue: "missing-session" | "expired-attempt") {
  return NextResponse.json({
    checks: buildConnectionDoctor({
      connection: "disconnected",
      connectionIssue: issue,
    }),
  });
}

function within<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    operation,
    new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("KeeperHub read timed out")),
        timeoutMs,
      );
    }),
  ]);
}
