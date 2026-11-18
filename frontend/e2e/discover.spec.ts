import { expect, test } from "@playwright/test";
import { serviceGet, signIn } from "./helpers";

const results = (page: import("@playwright/test").Page) => page.getByRole("list", { name: "Job results" });

test("sort, filter menus and eligibility flags", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one pass is enough");
  await page.goto("/discover");
  await expect(page.getByText("Live", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Recommended" }).click();
  await page.getByRole("button", { name: /^Most recent/ }).click();
  await expect(page).toHaveURL(/sort=recent/);

  await page.getByRole("button", { name: "Location" }).click();
  await page.getByRole("button", { name: "Ontario", exact: true }).click();
  await expect(page).toHaveURL(/province=ON/);
  await expect(results(page)).not.toContainText("Fixture Cloud");
  const flagged = results(page).getByRole("button", { name: /^Fixture Defence/ });
  await expect(flagged.getByText("Citizens / PR only")).toBeVisible();
  await expect(flagged.getByText("GPA 3.0+")).toBeVisible();

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Clear all" }).click();
  await expect(results(page)).toContainText("Fixture Cloud");
});

test("hide with undo, restore from Hidden, and report a listing", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one pass is enough");
  await signIn(page, `e2e-discover-${Date.now()}@test.local`);
  await page.goto("/discover");

  const label = "Fixture Games";
  const hide = results(page).getByRole("button", { name: /^Hide Gameplay Programmer Co-op at Fixture Games/ });
  await hide.click();
  await expect(results(page)).not.toContainText(label);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(results(page)).toContainText(label);

  await hide.click();
  await expect(results(page)).not.toContainText(label);
  await page.reload();
  await expect(results(page)).not.toContainText(label);
  await page.getByRole("group", { name: "Which listings" }).getByRole("button", { name: "Hidden" }).click();
  await expect(results(page)).toContainText(label);
  await results(page).getByRole("button", { name: /^Restore Gameplay Programmer Co-op/ }).click();
  await expect(results(page)).not.toContainText(label);
  await page.getByRole("group", { name: "Which listings" }).getByRole("button", { name: "Feed" }).click();
  await expect(results(page)).toContainText(label);

  await results(page).getByText("Gameplay Programmer Co-op").click();
  await page.getByRole("button", { name: "Report a problem" }).click();
  const dialog = page.getByRole("dialog", { name: "Report this listing" });
  await dialog.getByLabel("The posting is closed or expired").check();
  await dialog.getByRole("button", { name: "Send report" }).click();
  await expect(page.getByText("Thanks, we'll take a look at this listing.")).toBeVisible();
  const rows = await serviceGet("job_reports?select=reason,jobs(company_name)&order=created_at.desc&limit=1");
  expect(rows[0]).toMatchObject({ reason: "expired", jobs: { company_name: label } });
});
