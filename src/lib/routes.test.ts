import { describe, expect, it } from "vitest";

import { productRoutes } from "./routes";

describe("product route contract", () => {
  it("keeps the five approved surfaces explicit", () => {
    expect(productRoutes).toEqual([
      "/",
      "/app/new",
      "/app/goals",
      "/app/goals/[id]",
      "/proof/[id]",
    ]);
  });
});
