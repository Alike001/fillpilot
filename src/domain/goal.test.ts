import { describe, expect, it } from "vitest";

import {
  canScheduleWrite,
  isTerminal,
  transitionGoal,
  type Goal,
} from "./goal";
import { timestampMs, tokenAmount } from "./types";

const draftGoal: Goal = {
  deadline: timestampMs(1_000_000),
  id: "goal-1",
  minimumBuyAmount: tokenAmount(100n),
  replacementCount: 0,
  state: "DRAFT",
};

describe("goal state machine", () => {
  it("moves through the single allowed replacement path", () => {
    const armed = transitionGoal(draftGoal, "ARM");
    const watching = transitionGoal(armed, "START_WATCHING");
    const replacing = transitionGoal(watching, "BEGIN_REPLACEMENT");
    const replaced = transitionGoal(replacing, "POST_REPLACEMENT");

    expect(replaced).toMatchObject({ replacementCount: 1, state: "WATCHING" });
    expect(() => transitionGoal(replaced, "BEGIN_REPLACEMENT")).toThrow(
      /at most once/,
    );
  });

  it("blocks illegal jumps and every terminal write", () => {
    expect(() => transitionGoal(draftGoal, "START_WATCHING")).toThrow(/Cannot/);
    const fulfilled = transitionGoal(draftGoal, "FULFILL");

    expect(isTerminal(fulfilled.state)).toBe(true);
    expect(canScheduleWrite(fulfilled.state)).toBe(false);
    expect(() => transitionGoal(fulfilled, "FAIL")).toThrow(/Terminal/);
  });

  it("only treats active execution states as write-capable", () => {
    expect(canScheduleWrite("DRAFT")).toBe(false);
    expect(canScheduleWrite("READY")).toBe(true);
    expect(canScheduleWrite("WATCHING")).toBe(true);
    expect(canScheduleWrite("REPLACING")).toBe(true);
    expect(canScheduleWrite("MISSED")).toBe(false);
    expect(canScheduleWrite("FAILED")).toBe(false);
  });
});
