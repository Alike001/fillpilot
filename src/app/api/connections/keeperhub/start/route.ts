import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { parseServerEnv } from "@/env";
import {
  beginMcpAuthorization,
  parseAuthState,
  serializeAuthState,
} from "@/server/connections/mcp-oauth";
import {
  CONNECTION_COOKIE,
  openConnectionSession,
  sealConnectionSession,
} from "@/server/connections/session-cookie";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const env = parseServerEnv();
    if (!env.TOKEN_ENCRYPTION_KEY) {
      return NextResponse.json(
        { error: "Connection storage is not configured." },
        { status: 503 },
      );
    }

    const existingSession = openConnectionSession<string>(
      (await cookies()).get(CONNECTION_COOKIE)?.value,
    );
    const existing = existingSession
      ? parseAuthState(existingSession)
      : undefined;
    if (existing?.tokens?.access_token) {
      return NextResponse.redirect(
        new URL("/app/new?connected=existing", request.nextUrl.origin),
      );
    }

    const redirectUrl = new URL(
      "/api/connections/keeperhub/callback",
      request.nextUrl.origin,
    ).toString();
    const result = await beginMcpAuthorization(
      env.KEEPERHUB_MCP_URL,
      redirectUrl,
    );
    const response = NextResponse.redirect(result.authorizationUrl);
    response.cookies.set(
      CONNECTION_COOKIE,
      sealConnectionSession(serializeAuthState(result.stored)),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 10,
      },
    );
    return response;
  } catch {
    return NextResponse.json(
      { error: "KeeperHub authorization could not start." },
      { status: 502 },
    );
  }
}
