import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { parseServerEnv } from "@/env";
import { finishMcpAuthorization } from "@/server/connections/mcp-oauth";
import {
  readOAuthAttempt,
  saveOAuthAttempt,
} from "@/server/connections/oauth-attempt-store";
import {
  CONNECTION_COOKIE,
  openConnectionSession,
  sealConnectionSession,
} from "@/server/connections/session-cookie";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const env = parseServerEnv();
    const attemptId = openConnectionSession<string>(
      (await cookies()).get(CONNECTION_COOKIE)?.value,
    );
    if (!attemptId) throw new Error("Missing OAuth session");

    const auth = await readOAuthAttempt(attemptId);
    if (!auth) throw new Error("OAuth session expired");
    if (!auth.redirectUrl) throw new Error("Missing OAuth redirect origin");
    const result = await finishMcpAuthorization(
      env.KEEPERHUB_MCP_URL,
      auth.redirectUrl,
      request.nextUrl.searchParams,
      auth,
    );
    await saveOAuthAttempt(attemptId, result.stored);
    const response = NextResponse.redirect(
      new URL("/app/new?connected=1", request.nextUrl.origin),
    );
    response.cookies.set(CONNECTION_COOKIE, sealConnectionSession(attemptId), {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60,
    });
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
