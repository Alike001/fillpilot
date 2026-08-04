import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { parseServerEnv } from "@/env";
import {
  finishMcpAuthorization,
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
    const session = openConnectionSession<string>(
      (await cookies()).get(CONNECTION_COOKIE)?.value,
    );
    if (!session) throw new Error("Missing OAuth session");

    const redirectUrl = new URL(
      "/api/connections/keeperhub/callback",
      env.APP_URL,
    ).toString();
    const { stored } = await finishMcpAuthorization(
      env.KEEPERHUB_MCP_URL,
      redirectUrl,
      request.nextUrl.searchParams,
      parseAuthState(session),
    );
    const response = NextResponse.redirect(
      new URL("/app/new?connected=1", env.APP_URL),
    );
    response.cookies.set(
      CONNECTION_COOKIE,
      sealConnectionSession(serializeAuthState(stored)),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60,
      },
    );
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    const reason =
      message.includes("state") || message.includes("session")
        ? "callback-validation"
        : "token-exchange";
    return NextResponse.redirect(
      new URL(`/app/new?connection=failed&reason=${reason}`, request.url),
    );
  }
}
