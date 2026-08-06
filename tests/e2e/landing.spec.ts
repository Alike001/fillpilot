import { expect, test } from "@playwright/test";

test("explains FillPilot without claiming a fake execution", async ({
  page,
}) => {
  const runtimeErrors: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message.text().includes("/_next/webpack-hmr")
    ) {
      runtimeErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => runtimeErrors.push(error.message));

  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /Your fill has a deadline/i,
    }),
  ).toBeVisible();
  await expect(page.getByText("No execution connected yet")).toBeVisible();
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);

  await page.getByRole("link", { name: /Open the workspace/i }).click();
  await expect(page).toHaveURL(/\/app\/new$/);
  await expect(
    page.getByRole("heading", { level: 1, name: /Define one fill/i }),
  ).toBeVisible();
  await expect(page.getByText(/Write boundary protected/i)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Confirm the execution environment/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Connect KeeperHub/i }),
  ).toBeVisible();
  await expect(
    page.getByText(/Quote and KeeperHub simulation controls become available/i),
  ).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test("keeps a goal quote read-only", async ({ page }) => {
  await page.goto("/app/goals/example-goal");

  await expect(
    page.getByRole("heading", { name: "Keep every boundary visible." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Request fresh CoW quote" }),
  ).toBeVisible();
  await expect(
    page.getByText(/cannot sign, submit an order, approve USDC/i),
  ).toBeVisible();
  await expect(
    page.getByText(
      /onchain authorization exists only when this goal shows a transaction hash/i,
    ),
  ).toBeVisible();
});
