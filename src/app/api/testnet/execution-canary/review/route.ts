import { NextResponse } from "next/server";

import {
  buildPublicExecutionCanaryReview,
  verifyPublicExecutionCanary,
} from "@/server/integrations/public-execution-canary";

export const runtime = "nodejs";

/**
 * Returns exact calldata for inspection only. A runtime code-hash check must
 * pass before the public contract is offered for any later simulation review.
 */
export async function GET() {
  const check = await verifyPublicExecutionCanary();
  if (check.status !== "verified-external-canary") {
    return NextResponse.json(
      { error: check.reason, writesEnabled: false },
      { status: 409 },
    );
  }
  return NextResponse.json({
    review: buildPublicExecutionCanaryReview(),
    observedCodeHash: check.observedCodeHash,
    writesEnabled: false,
  });
}
