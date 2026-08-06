import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const originalEnablement = process.env.ENABLE_MAINNET_WRITES;

afterEach(() => {
  if (originalEnablement === undefined)
    delete process.env.ENABLE_MAINNET_WRITES;
  else process.env.ENABLE_MAINNET_WRITES = originalEnablement;
  vi.restoreAllMocks();
});

describe("POST /api/goals/[id]/presign-execution", () => {
  it("fails closed before reading a session or calling an integration", async () => {
    delete process.env.ENABLE_MAINNET_WRITES;
    const response = await POST(
      new NextRequest("http://127.0.0.1/api/goals/goal-1/presign-execution", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "goal-1" }) },
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ error: expect.stringMatching(/disabled/) }),
    );
  });
});
