import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { buildConnectionDoctor } from "@/server/connections/doctor";
import { parseAuthState } from "@/server/connections/mcp-oauth";
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
    const session = openConnectionSession<string>(sealed);
    const auth = session ? parseAuthState(session) : undefined;
    const connected = Boolean(auth?.tokens?.access_token);
    if (!connected || !auth?.walletAddress) {
      return NextResponse.json({
        checks: buildConnectionDoctor({
          connection: connected ? "connected" : "disconnected",
          walletAddress: auth?.walletAddress,
        }),
      });
    }

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
      checks: buildConnectionDoctor({ connection: "disconnected" }),
    });
  }
}
