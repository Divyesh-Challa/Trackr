import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { column, serviceGet, signIn } from "./helpers";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

test.describe("tracker", () => {
  test("sign in, save from feed, move by mouse and keyboard, persists with one history row per move", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "drag and drop is desktop-only; mobile uses the Move to menu");
    const email = `e2e-${Date.now()}@test.local`;
    await signIn(page, email);
    await expect(page.getByText("Nothing tracked yet")).toBeVisible();

    // Save the first job in the feed to the wishlist.
    await page.goto("/discover");
    const firstJob = page.getByRole("list", { name: "Job results" }).getByRole("button").first();
    const role = (await firstJob.locator("h3").textContent())!.trim();
    await firstJob.click();
    await page.getByRole("button", { name: "Save to wishlist" }).click();
    await expect(page.getByText("In your tracker")).toBeVisible();

    await page.goto("/board");
    const card = page.getByRole("button", { name: new RegExp(`^${escapeRe(role)} at`) });
    await expect(column(page, "Wishlist")).toContainText(role);

    // Mouse drag: Wishlist -> Applied.
    const target = column(page, "Applied").locator("ul");
    const from = await card.boundingBox();
    const to = await target.boundingBox();
    await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
    await page.mouse.down();
    await page.mouse.move(from!.x + from!.width / 2 + 20, from!.y + 20, { steps: 5 });
    await page.mouse.move(to!.x + to!.width / 2, to!.y + 40, { steps: 15 });
    await page.mouse.up();
    await expect(page.getByText("Moved to Applied")).toBeVisible();

    await page.reload();
    await expect(column(page, "Applied")).toContainText(role);
    await expect(column(page, "Wishlist")).not.toContainText(role);

    // Keyboard: pick up with space, arrow right into "Online assessment", drop with space.
    await card.focus();
    await page.keyboard.press("Space");
    await expect(card).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("status").filter({ hasText: "Over Online assessment" })).toBeAttached();
    await page.keyboard.press("Space");
    await expect(page.getByText("Moved to Online assessment")).toBeVisible();

    await page.reload();
    await expect(column(page, "Online assessment")).toContainText(role);

    // Enter opens the drawer; history shows exactly the three real events.
    await card.focus();
    await page.keyboard.press("Enter");
    const drawer = page.getByRole("dialog");
    await expect(drawer.getByRole("heading", { name: role })).toBeVisible();
    await drawer.getByRole("tab", { name: "History" }).click();
    await expect(drawer.locator("ol li")).toHaveCount(3);

    const users = await serviceGet(`applications?select=id,status,applied_at,user_id&role_title=eq.${encodeURIComponent(role)}&order=created_at.desc&limit=1`);
    const rows = await serviceGet(`application_state_transitions?select=from_status,to_status&application_id=eq.${users[0].id}&order=transitioned_at`);
    expect(rows.map((r: { to_status: string }) => r.to_status)).toEqual(["wishlist", "applied", "oa"]);
    expect(users[0].applied_at).not.toBeNull();
  });

  test("add by pasting a feed link, add a task with a due date, see it on the card", async ({ page }, info) => {
    await signIn(page, `e2e-add-${Date.now()}@test.local`);
    const [job] = await serviceGet("jobs?select=job_url,title,company_name&is_active=eq.true&job_url_canonical=like.greenhouse:*&limit=1");

    await page.getByRole("button", { name: "Add application" }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Paste a job link (optional)").fill(job.job_url);
    await dialog.getByRole("button", { name: "Fill in" }).click();
    await expect(dialog.getByText("Found it in the jobs feed")).toBeVisible();
    await expect(dialog.getByLabel("Role")).toHaveValue(job.title);
    await dialog.getByRole("button", { name: "Add", exact: true }).click();
    await expect(dialog).toBeHidden();

    if (info.project.name === "desktop") {
      await page.getByRole("button", { name: new RegExp(`^${escapeRe(job.title)} at ${escapeRe(job.company_name)}`) }).first().click();
    } else {
      await page.getByRole("button", { name: new RegExp(escapeRe(job.title)) }).first().click();
    }
    const drawer = page.getByRole("dialog");
    await drawer.getByRole("tab", { name: "Tasks" }).click();
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    await drawer.getByLabel("New task").fill("Finish the OA");
    await drawer.getByLabel("Due date").fill(tomorrow);
    await drawer.getByRole("button", { name: "Add", exact: true }).click();
    await expect(drawer.getByText("Finish the OA")).toBeVisible();
    await drawer.getByRole("button", { name: "Close" }).click();

    await expect(page.getByText("Task due tomorrow").first()).toBeVisible();
  });

  test("unsupported links don't fetch anything and keep the link", async ({ page }) => {
    await signIn(page, `e2e-ssrf-${Date.now()}@test.local`);
    await page.getByRole("button", { name: "Add application" }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Paste a job link (optional)").fill("http://169.254.169.254/latest/meta-data/");
    await dialog.getByRole("button", { name: "Fill in" }).click();
    await expect(dialog.getByText("We can only read Greenhouse, Lever and Ashby links")).toBeVisible();
  });

  test("CSV import and export round-trip", async ({ page }, info) => {
    await signIn(page, `e2e-csv-${Date.now()}@test.local`);
    const csv = "Company Name,Job Title,Stage,Date Applied\nShopify,Dev Intern,Phone Screen,2026-09-30\nRBC,Analyst Co-op,applied,2026-10-02\nBad,,applied,\n";
    await page.locator('input[type="file"]').setInputFiles({ name: "apps.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
    await expect(page.getByText(/Imported 2 applications\. Skipped 1 row/)).toBeVisible();
    if (info.project.name === "desktop") {
      await expect(column(page, "Interviewing")).toContainText("Dev Intern");
    } else {
      await page.getByRole("tab", { name: /Interviewing/ }).click();
      await expect(page.getByText("Dev Intern")).toBeVisible();
    }

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export CSV" }).click();
    const file = await (await download).path();
    const text = readFileSync(file, "utf8");
    expect(text).toContain("Shopify,Dev Intern,interviewing");
    expect(text).toContain("RBC,Analyst Co-op,applied");
  });

  test("mobile: column tabs and Move to menu", async ({ page }, info) => {
    test.skip(info.project.name !== "mobile", "mobile layout");
    await signIn(page, `e2e-mobile-${Date.now()}@test.local`);
    await page.locator('input[type="file"]').setInputFiles({ name: "a.csv", mimeType: "text/csv", buffer: Buffer.from("company,role,status\nAcme,Mobile Intern,applied\n") });
    await expect(page.getByText("Mobile Intern")).toBeVisible();
    await page.getByLabel("Move to").selectOption({ label: "Interviewing" });
    await expect(page.getByText("Moved to Interviewing")).toBeVisible();
    await page.getByRole("tab", { name: /Interviewing/ }).click();
    await expect(page.getByText("Mobile Intern")).toBeVisible();
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(375);
  });
});
