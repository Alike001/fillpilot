import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    status: "deployment-required",
    writesEnabled: false,
    boundary:
      "The FillPilot canary contract must be deployed and separately reviewed before calldata can be prepared.",
  });
}
