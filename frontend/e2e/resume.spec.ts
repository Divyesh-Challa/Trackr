import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { serviceGet, servicePost, signIn } from "./helpers";

// Fills a builder field and blurs it, which is when it saves.
async function fill(page: Page, scope: ReturnType<Page["locator"]> | Page, label: string, value: string) {
  const field = scope.getByLabel(label, { exact: true });
  await field.fill(value);
  await field.blur();
}

const entryCard = (page: Page, title: string) => page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: title, exact: true }) });

test.describe("resume builder", () => {
  test("build a Jake's-style resume, reorder, export LaTeX, and see it after a reload", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "one full pass is enough; mobile layout is covered below");
    const email = `resume-${Date.now()}@test.local`;
    await signIn(page, email);
    await page.getByRole("link", { name: "Resume" }).first().click();
    await expect(page.getByRole("heading", { name: "Resume", level: 1 })).toBeVisible();
    const preview = page.getByRole("article", { name: "Resume preview" });

    // Contact. A bare link gets https:// so the database accepts it.
    const contact = page.locator("section", { has: page.getByRole("heading", { name: "Contact" }) });
    await fill(page, contact, "Full name", "Jake Ryan");
    await fill(page, contact, "Email", "jake@su.edu");
    await fill(page, contact, "Phone", "123-456-7890");
    await fill(page, contact, "GitHub", "github.com/jake");
    await expect(contact.getByLabel("GitHub")).toHaveValue("https://github.com/jake");
    await expect(preview).toContainText("Jake Ryan");
    await expect(preview.getByRole("link", { name: "github.com/jake" })).toHaveAttribute("href", "https://github.com/jake");

    // Education.
    await page.getByRole("button", { name: "Add school" }).click();
    const school = entryCard(page, "New school");
    await fill(page, school, "School", "Southwestern University");
    await fill(page, school, "Location", "Georgetown, TX");
    await fill(page, school, "Degree", "Bachelor of Arts in Computer Science, Minor in Business");
    // The card is titled by its degree now.
    const degree = entryCard(page, "Bachelor of Arts in Computer Science, Minor in Business");
    await fill(page, degree, "Start", "Aug. 2018");
    await fill(page, degree, "End", "May 2021");

    // Experience, with bullets pasted as a list (markers are stripped).
    await page.getByRole("button", { name: "Add role" }).click();
    const role = entryCard(page, "New role");
    await fill(page, role, "Company", "Texas A&M University");
    await fill(page, role, "Role", "Undergraduate Research Assistant");
    const job = entryCard(page, "Undergraduate Research Assistant");
    await fill(page, job, "Location", "College Station, TX");
    await fill(page, job, "Start", "June 2020");
    await fill(page, job, "End", "Present");
    const newBullet = job.getByLabel("New bullet for Undergraduate Research Assistant");
    await newBullet.fill("- Developed a REST API using FastAPI and PostgreSQL\n• Cut query time by 50% & more with indexes");
    await job.getByRole("button", { name: "Add", exact: true }).click();
    await expect(job.getByRole("list", { name: /Bullets for/ }).getByRole("listitem")).toHaveCount(2);
    await expect(newBullet).toHaveValue("");

    // Reorder: the second bullet moves to the top, in the editor and the preview.
    await job.getByRole("button", { name: "Move bullet 2 up" }).click();
    await expect(job.getByLabel("Bullet 1", { exact: true })).toHaveValue("Cut query time by 50% & more with indexes");
    const items = preview.locator("li");
    await expect(items.first()).toHaveText("Cut query time by 50% & more with indexes");

    // A project and a skills line.
    await page.getByRole("button", { name: "Add project" }).click();
    const project = entryCard(page, "New project");
    await fill(page, project, "Project name", "Gitlytics");
    await fill(page, entryCard(page, "Gitlytics"), "Technologies", "Python, Flask, React, PostgreSQL, Docker");
    await page.getByLabel("New skill category").fill("Languages");
    await page.getByLabel("Skills in that category").fill("Java, Python, C/C++, SQL (Postgres), JavaScript");
    await page.getByLabel("Skills in that category").press("Enter");

    for (const section of ["Education", "Experience", "Projects", "Technical Skills"]) {
      await expect(preview.getByRole("heading", { name: section })).toBeVisible();
    }
    await expect(page.getByText("One page")).toBeVisible();

    // The .tex download is Jake's template with every special character escaped.
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download .tex" }).click()]);
    expect(download.suggestedFilename()).toBe("jake-ryan-resume.tex");
    const tex = readFileSync((await download.path())!, "utf8");
    expect(tex).toContain("\\documentclass[letterpaper,11pt]{article}");
    expect(tex).toContain("{Texas A\\&M University}{College Station, TX}");
    expect(tex).toContain("\\resumeItem{Cut query time by 50\\% \\& more with indexes}");
    expect(tex).toContain("\\textbf{Gitlytics} $|$ \\emph{Python, Flask, React, PostgreSQL, Docker}");
    expect(tex).toContain("\\href{https://github.com/jake}{\\underline{github.com/jake}}");
    expect(tex.indexOf("\\section{Education}")).toBeLessThan(tex.indexOf("\\section{Experience}"));

    // Everything was saved.
    await page.reload();
    await expect(preview).toContainText("Southwestern University");
    await expect(preview.locator("li").first()).toHaveText("Cut query time by 50% & more with indexes");
    await expect(preview).toContainText("Languages: Java, Python");

    // Deleting an entry asks first, then removes it and its bullets.
    await entryCard(page, "Gitlytics").getByRole("button", { name: "Delete Gitlytics" }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(preview).not.toContainText("Gitlytics");
  });

  test("older bullets can be sorted into an entry, and a tailored version shows only chosen bullets", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "desktop only");
    const email = `resume-tailor-${Date.now()}@test.local`;
    await signIn(page, email);
    const [user] = await serviceGet(`profiles?select=id&order=created_at.desc&limit=1`);
    const rows = await servicePost("resume_bullets", [
      { user_id: user.id, section: "experience", heading: "Developer Intern, Acme", content: "Shipped a billing dashboard used by 40 support staff", position: 0 },
      { user_id: user.id, section: "experience", heading: "Developer Intern, Acme", content: "Wrote integration tests for the payments API", position: 1 },
    ]);

    await page.goto("/resume");
    const loose = page.locator("section", { has: page.getByRole("heading", { name: "Bullets to sort" }) });
    await expect(loose).toContainText("Developer Intern, Acme");
    await loose.getByRole("button", { name: "Make it a role" }).click();
    await expect(loose).toBeHidden();
    const preview = page.getByRole("article", { name: "Resume preview" });
    await expect(preview.locator("li")).toHaveCount(2);

    // What the AI tab stores when you open a tailoring: one bullet, reworded.
    await page.evaluate(
      ([id]) =>
        sessionStorage.setItem("trackr:tailoring", JSON.stringify({ label: "Backend Intern at Shopify", bullets: [{ bullet_id: id, text: "Built payments API integration tests" }] })),
      [rows[1].id]
    );
    await page.goto("/resume?tailored=1");
    await expect(page.getByRole("status").filter({ hasText: "Tailored for Backend Intern at Shopify" })).toBeVisible();
    await expect(preview.locator("li")).toHaveText(["Built payments API integration tests"]);
    await page.getByRole("button", { name: "Show full resume" }).click();
    await expect(preview.locator("li")).toHaveCount(2);
  });

  test("mobile: editor and preview stack without horizontal scroll", async ({ page }, info) => {
    test.skip(info.project.name !== "mobile", "mobile only");
    await signIn(page, `resume-m-${Date.now()}@test.local`);
    await page.goto("/resume");
    await expect(page.getByRole("button", { name: "Add role" })).toBeVisible();
    await expect(page.getByRole("article", { name: "Resume preview" })).toBeAttached();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
