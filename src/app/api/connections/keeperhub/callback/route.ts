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
    if (!attemptId) throw new CallbackValidationError("missing-session");

    const auth = await readOAuthAttempt(attemptId);
    if (!auth) throw new CallbackValidationError("expired-attempt");
    if (!auth.redirectUrl)
      throw new CallbackValidationError("missing-redirect");

    const returnedState = request.nextUrl.searchParams.get("state");
    if (!returnedState) throw new CallbackValidationError("missing-state");
    if (returnedState !== auth.state)
      throw new CallbackValidationError("state-mismatch");
    if (!request.nextUrl.searchParams.get("code"))
      throw new CallbackValidationError("missing-code");

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
    const reason =
      error instanceof CallbackValidationError
        ? error.reason
        : "token-exchange";
    return NextResponse.redirect(
      new URL(`/app/new?connection=failed&reason=${reason}`, request.url),
    );
  }
}

class CallbackValidationError extends Error {
  constructor(readonly reason: string) {
    super(reason);
  }
}
