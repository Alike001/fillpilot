import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { readOAuthAttempt } from "@/server/connections/oauth-attempt-store";
import {
  CONNECTION_COOKIE,
  openConnectionSession,
} from "@/server/connections/session-cookie";
import { listGoalHistoryForWallet } from "@/server/db/repository";

export const runtime = "nodejs";

export async function GET() {
  try {
    const attemptId = openConnectionSession<string>(
      (await cookies()).get(CONNECTION_COOKIE)?.value,
    );
    const auth = attemptId ? await readOAuthAttempt(attemptId) : undefined;
    if (!auth?.walletAddress)
      return NextResponse.json(
        { error: "Connect KeeperHub to view goals." },
        { status: 401 },
      );
    return NextResponse.json({
      goals: await listGoalHistoryForWallet(auth.walletAddress),
    });
  } catch {
    return NextResponse.json(
      { error: "Goal history is unavailable." },
      { status: 502 },
    );
  }
}
