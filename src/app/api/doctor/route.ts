import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { parseServerEnv } from "@/env";
import { buildConnectionDoctor } from "@/server/connections/doctor";
import {
  parseAuthState,
  refreshMcpWallet,
  serializeAuthState,
} from "@/server/connections/mcp-oauth";
import {
  CONNECTION_COOKIE,
  openConnectionSession,
  sealConnectionSession,
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
    const session = openConnectionSession<string>(sealed);
    const auth = session ? parseAuthState(session) : undefined;
    const connected = Boolean(auth?.tokens?.access_token);
    if (connected && auth?.redirectUrl && !auth.walletAddress) {
      await within(
        refreshMcpWallet(
          parseServerEnv().KEEPERHUB_MCP_URL,
          auth.redirectUrl,
          auth,
        ),
        10_000,
      );
    }
    if (!connected || !auth?.walletAddress) {
      const response = NextResponse.json({
        checks: buildConnectionDoctor({
          connection: connected ? "connected" : "disconnected",
          walletAddress: auth?.walletAddress,
        }),
      });
      if (auth) persistSession(response, auth);
      return response;
    }

    const balances = await readBaseWallet(
      auth.walletAddress,
      COW_PROTOCOL_VAULT_RELAYER_ADDRESS[
        SupportedChainId.BASE
      ] as `0x${string}`,
    );
    const response = NextResponse.json({
      checks: buildConnectionDoctor({
        connection: "connected",
        walletAddress: auth.walletAddress,
        chainId: 8453,
        ...balances,
      }),
    });
    persistSession(response, auth);
    return response;
  } catch {
    return NextResponse.json({
      checks: buildConnectionDoctor({ connection: "disconnected" }),
    });
  }
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

function persistSession(
  response: NextResponse,
  auth: NonNullable<ReturnType<typeof parseAuthState>>,
) {
  response.cookies.set(
    CONNECTION_COOKIE,
    sealConnectionSession(serializeAuthState(auth)),
    { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 },
  );
}
