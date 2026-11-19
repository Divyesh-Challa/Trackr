import { expect, test } from "@playwright/test";
import { serviceGet, signIn } from "./helpers";

test("apply kit fills the form from the profile, then saves a receipt and marks it applied", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one pass is enough");
  const stamp = Date.now();
  const email = `e2e-kit-${stamp}@test.local`;
  const letter = `I would like to join the data team. ${stamp}`;
  await signIn(page, email);
  const [job] = (await serviceGet("jobs?select=id&job_url_canonical=eq.careers.example.com/jobs/3")) as { id: string }[];
  await page.goto(`/discover/${job.id}`);

  await page.getByRole("button", { name: "Build my apply kit" }).click();
  const kit = page.getByRole("region", { name: "Apply kit" });
  await expect(kit.getByRole("tab", { name: /^Form/ })).toBeVisible();
  await expect(kit.getByLabel(/^Email/)).toHaveValue(email);
  await kit.getByLabel(/^First name/).fill("Ada");
  await kit.getByRole("tab", { name: "Cover letter" }).click();
  await kit.getByRole("textbox", { name: "Cover letter" }).fill(letter);

  await kit.getByRole("button", { name: "I submitted it" }).click();
  await expect(kit.getByRole("status")).toContainText("Saved to your tracker as Applied");

  const [receipt] = (await serviceGet(`application_submissions?select=application_id,answers,source&cover_letter=eq.${encodeURIComponent(letter)}`)) as {
    application_id: string; answers: { label: string; value: string }[]; source: string;
  }[];
  expect(receipt.source).toBe("manual");
  expect(receipt.answers.find((a) => a.label === "First name")?.value).toBe("Ada");
  const [app] = (await serviceGet(`applications?select=status,applied_at&id=eq.${receipt.application_id}`)) as { status: string; applied_at: string | null }[];
  expect(app.status).toBe("applied");
  expect(app.applied_at).not.toBeNull();

  await page.goto("/board");
  await page.getByRole("button", { name: /Data Analyst Intern/ }).first().click();
  await page.getByRole("tab", { name: "Receipts" }).click();
  await expect(page.getByText(letter)).toBeAttached();
});
