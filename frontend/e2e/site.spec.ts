import { expect, test } from "@playwright/test";
import { serviceGet, signIn } from "./helpers";

test("signed-out visitors get the landing page with live numbers", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Every Canadian internship");
  await expect(page.getByText(/\d[\d,]* open roles at \d[\d,]* companies/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Just posted" })).toBeVisible();
  await page.getByRole("link", { name: "Browse internships" }).click();
  await expect(page).toHaveURL(/\/discover$/);
});

test("signed-in visitors go straight to their board, and /board needs sign-in", async ({ page }) => {
  await page.goto("/board");
  await expect(page).toHaveURL(/\/login\?next=%2Fboard/);
  await signIn(page, `e2e-site-${Date.now()}@test.local`);
  await page.goto("/");
  await expect(page).toHaveURL(/\/board$/);
});

test("phone layout: menu works and nothing scrolls sideways", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "mobile layout");
  for (const path of ["/", "/discover", "/login"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(375);
  }
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.locator("#mobile-menu");
  await expect(menu.getByRole("link", { name: "Discover" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
});

test("feedback needs sign-in, then saves what was sent", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one pass is enough");
  await page.goto("/feedback");
  await expect(page).toHaveURL(/\/login\?next=%2Ffeedback/);
  await signIn(page, `e2e-feedback-${Date.now()}@test.local`);
  await page.goto("/feedback");
  const message = `The Ottawa filter misses a job ${Date.now()}`;
  await page.getByRole("button", { name: "Wrong job data" }).click();
  await page.getByLabel("Details").fill(message);
  await page.getByRole("button", { name: "Send feedback" }).click();
  await expect(page.getByRole("heading", { name: "Thank you" })).toBeVisible();
  const rows = await serviceGet(`feedback?select=kind&message=eq.${encodeURIComponent(message)}`);
  expect(rows).toEqual([{ kind: "job_data" }]);
});
