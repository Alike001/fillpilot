import { expect, test } from "@playwright/test";

function localDateTimeValue(date: Date): string {
  const part = (value: number) => value.toString().padStart(2, "0");
  return (
    [date.getFullYear(), part(date.getMonth() + 1), part(date.getDate())].join(
      "-",
    ) + `T${part(date.getHours())}:${part(date.getMinutes())}`
  );
}

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
  await expect(
    page.getByRole("heading", { name: /Confirm the execution environment/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Connect KeeperHub/i }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Sell amount" }).fill("12.5");
  await page
    .getByRole("textbox", { name: "Preferred receive amount" })
    .fill("0.0042");
  await page
    .getByRole("textbox", { name: "Minimum receive amount" })
    .fill("0.004");
  await page
    .getByLabel("Deadline")
    .fill(localDateTimeValue(new Date(Date.now() + 30 * 60 * 1000)));
  await expect(page.getByText("0.0042 WETH")).toBeVisible();
  await page.getByRole("button", { name: "Validate execution plan" }).click();
  await expect(page.getByText(/Inputs are valid\. No goal/i)).toBeVisible();
  await expect(
    page.getByText(/Quotes, approvals, KeeperHub simulations/i),
  ).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});
