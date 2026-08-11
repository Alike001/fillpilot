import { describe, expect, it, vi } from "vitest";

import { createCheckpointRuntime } from "./checkpoint-runtime";
import { runWorkerCycle } from "./worker-cycle";

vi.mock("./worker-cycle", () => ({ runWorkerCycle: vi.fn() }));

describe("checkpoint runtime", () => {
  it("creates a disabled, one-cycle composition without starting a loop", () => {
    const runtime = createCheckpointRuntime();

    expect(typeof runtime.runOnce).toBe("function");
    expect(runWorkerCycle).not.toHaveBeenCalled();
  });
});
