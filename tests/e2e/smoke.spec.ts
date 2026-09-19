import { expect, test } from "@playwright/test";

test("the experiment is usable on desktop and mobile", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Example Experiment");

  await page.getByRole("button", { name: "Start the experiment" }).click();
  await expect(page.getByRole("status")).toContainText("interaction complete");
});
