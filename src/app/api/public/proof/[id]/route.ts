import { NextResponse } from "next/server";

import { VERIFIED_TESTNET_PROOF } from "@/server/proof/verified-testnet-proof";

export const runtime = "nodejs";

/** Serves a fixed, public proof record. It has no credential or write path. */
export async function GET(
  _request: Request,
  context: RouteContext<"/api/public/proof/[id]">,
) {
  const { id } = await context.params;
  if (id !== VERIFIED_TESTNET_PROOF.id) {
    return NextResponse.json({ error: "Proof not found." }, { status: 404 });
  }
  return NextResponse.json({ proof: VERIFIED_TESTNET_PROOF });
}
