import { expect, test } from "@playwright/test";
import { serviceGet, signIn } from "./helpers";

test("signed-out visitors get the landing page with live numbers", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Every Canadian co");
  await expect(page.getByText(/from \d[\d,]* company job boards/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fresh every six hours" })).toBeVisible();
  await page.getByRole("link", { name: /^Browse \d[\d,]* roles/ }).click();
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
  for (const path of ["/", "/discover", "/login", "/internships/toronto", "/guide"]) {
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

test("browse pages list live roles, link into Discover, and job pages show related roles", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one pass is enough");
  await page.goto("/internships/toronto");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tech internships and co-ops in Toronto");
  const firstJob = page.locator('main a[href^="/discover/"]').first();
  await expect(firstJob).toBeVisible();
  await page.getByRole("link", { name: /Filter and sort all/ }).click();
  await expect(page).toHaveURL(/\/discover\?city=Toronto/);
  await expect(page.getByRole("button", { name: /Remove filter Toronto area/ })).toBeVisible();

  await page.goto("/roles/nope");
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(/internships/);

  await page.goto("/internships/toronto");
  await firstJob.click();
  await expect(page).toHaveURL(/\/discover\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("main").getByRole("link", { name: "All jobs" })).toBeVisible();
});

test("the guide and the landing's skill demo work without an account", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one pass is enough");
  await page.goto("/guide");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Landing a tech internship in Canada");
  await page.goto("/");
  await page.getByRole("button", { name: "Try a sample" }).click();
  await expect(page.getByText(/Found \d+ skills/)).toBeVisible();
  await expect(page.getByRole("link", { name: "By city" }).or(page.getByRole("navigation", { name: "Jobs by city" }))).toBeVisible();
});
