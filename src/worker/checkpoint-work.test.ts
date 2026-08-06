import { describe, expect, it } from "vitest";

import { CHECKPOINT_LEAD_MS } from "@/domain/checkpoint";

import { buildCheckpointWork } from "./checkpoint-work";

describe("checkpoint work", () => {
  it("schedules one stable, deduplicated checkpoint five minutes before the deadline", () => {
    const deadline = new Date("2026-08-06T12:00:00.000Z");

    expect(buildCheckpointWork("goal-1", deadline)).toEqual({
      goalId: "goal-1",
      kind: "CHECKPOINT",
      deduplicationKey: "goal-1:checkpoint:v1",
      dueAt: new Date(deadline.getTime() - CHECKPOINT_LEAD_MS),
    });
  });

  it("rejects an absent goal or invalid deadline before it can schedule work", () => {
    expect(() => buildCheckpointWork("", new Date())).toThrow(/goal/);
    expect(() => buildCheckpointWork("goal-1", new Date("invalid"))).toThrow(
      /deadline/,
    );
  });
});
