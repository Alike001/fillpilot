import { NextResponse } from "next/server";

import {
  PUBLIC_BASE_SEPOLIA_EXECUTION_CANARY,
  verifyPublicExecutionCanary,
} from "@/server/integrations/public-execution-canary";

export const runtime = "nodejs";

export async function GET() {
  const check = await verifyPublicExecutionCanary();
  if (check.status === "unavailable-external-canary") {
    return NextResponse.json({
      status: check.status,
      writesEnabled: false,
      boundary: check.reason,
    });
  }

  return NextResponse.json({
    status: check.status,
    writesEnabled: false,
    chainId: PUBLIC_BASE_SEPOLIA_EXECUTION_CANARY.chainId,
    contract: PUBLIC_BASE_SEPOLIA_EXECUTION_CANARY.contract,
    observedCodeHash: check.observedCodeHash,
    boundary:
      "A public Base Sepolia ping canary has verified runtime code. It is external execution evidence only, not a FillPilot deployment, CoW order, token approval, or permission to write.",
  });
}
