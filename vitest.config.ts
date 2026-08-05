import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const src = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  resolve: { alias: { "@": src } },
  test: {
    projects: [
      {
        resolve: { alias: { "@": src } },
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.integration.test.ts"],
          environment: "node",
        },
      },
      {
        resolve: { alias: { "@": src } },
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          fileParallelism: false,
        },
      },
      {
        resolve: { alias: { "@": src } },
        test: {
          name: "fork",
          include: ["tests/fork/**/*.test.ts"],
          environment: "node",
          fileParallelism: false,
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/domain/**/*.ts", "src/env.ts", "src/lib/routes.ts"],
      exclude: ["src/**/*.test.ts"],
      thresholds: {
        branches: 90,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
});
