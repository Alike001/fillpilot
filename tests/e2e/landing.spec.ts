import { expect, test } from "@playwright/test";

test("explains FillPilot without claiming a fake execution", async ({
  page,
}) => {
  const runtimeErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
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
  await expect(
    page.getByText(/KeeperHub execution is deliberately disabled/i),
  ).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});
