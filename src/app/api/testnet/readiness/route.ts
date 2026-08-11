import { NextResponse } from "next/server";

import { parseServerEnv, requireEthereumSepoliaReadReady } from "@/env";
import { executionNetwork } from "@/server/integrations/execution-network";

export const runtime = "nodejs";

/**
 * Configuration-only readiness check. It does not contact KeeperHub, CoW, an
 * RPC, or any wallet, and it cannot enable or submit a transaction.
 */
export async function GET() {
  const env = parseServerEnv();
  const network = executionNetwork("ethereum-sepolia");
  try {
    requireEthereumSepoliaReadReady(env);
    return NextResponse.json({
      chainId: network.chainId,
      network: network.label,
      status: "configured",
      writesEnabled: false,
    });
  } catch (error) {
    return NextResponse.json({
      chainId: network.chainId,
      network: network.label,
      reason:
        error instanceof Error
          ? error.message
          : "Testnet readiness unavailable.",
      status: "not-configured",
      writesEnabled: false,
    });
  }
}
