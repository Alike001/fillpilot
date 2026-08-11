import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { parseServerEnv, requireEthereumSepoliaReadReady } from "@/env";
import type { GoalDraftInput } from "@/domain/goal-draft";
import { readOAuthAttempt } from "@/server/connections/oauth-attempt-store";
import {
  CONNECTION_COOKIE,
  openConnectionSession,
} from "@/server/connections/session-cookie";
import { saveDraftGoal } from "@/server/db/repository";
import { selectedExecutionNetwork } from "@/server/integrations/execution-network";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const input = (await request.json()) as GoalDraftInput;
    const attemptId = openConnectionSession<string>(
      (await cookies()).get(CONNECTION_COOKIE)?.value,
    );
    const auth = attemptId ? await readOAuthAttempt(attemptId) : undefined;
    if (!auth) {
      return NextResponse.json(
        { error: "Connect KeeperHub before saving." },
        { status: 401 },
      );
    }
    const env = parseServerEnv();
    const profile = selectedExecutionNetwork(env);
    if (profile.isTestnet) requireEthereumSepoliaReadReady(env);
    const goal = await saveDraftGoal(auth, input, profile);
    return NextResponse.json({ id: goal.id }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save draft.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
