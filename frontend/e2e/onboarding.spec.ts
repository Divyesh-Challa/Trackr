import { expect, test } from "@playwright/test";
import { serviceGet, signIn } from "./helpers";

test("onboarding saves contact, work authorization and preferences, then opens the board", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one pass is enough");
  const stamp = Date.now();
  const email = `onboard-${stamp}@test.local`;
  await signIn(page, email, { stayOnOnboarding: true });

  await expect(page.getByRole("heading", { name: "Resume", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Contact", level: 1 })).toBeVisible();
  await page.getByLabel("Full name").fill(`Ada ${stamp}`);
  await page.getByLabel("Phone").fill("780-555-0100");
  await page.getByLabel("LinkedIn").fill("linkedin.com/in/ada");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Work authorization", level: 1 })).toBeVisible();
  await page.getByLabel("City", { exact: true }).fill("Edmonton");
  const canada = page.getByRole("group", { name: "Canada" });
  await canada.getByLabel("Legally allowed to work?").selectOption("yes");
  await canada.getByLabel("Need visa sponsorship?").selectOption("no");
  await page.getByLabel("City", { exact: true }).press("Enter"); // Enter continues, like every step

  await expect(page.getByRole("heading", { name: "Logistics", level: 1 })).toBeVisible();
  await page.getByLabel("Earliest start").fill("May 2027");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Self-identification", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "How we help", level: 1 })).toBeVisible();
  await expect(page.getByLabel(/Honest/)).toBeChecked();
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();

  const [profile] = await serviceGet(`profiles?select=id,linkedin_url&full_name=eq.Ada%20${stamp}`);
  expect(profile.linkedin_url).toBe("https://linkedin.com/in/ada");
  const [app] = await serviceGet(`application_profiles?select=*&user_id=eq.${profile.id}`);
  expect(app.city).toBe("Edmonton");
  expect(app.work_auth.Canada).toEqual({ authorized: true, needs_sponsorship: false });
  expect(app.earliest_start).toBe("May 2027");
  expect(app.tailoring).toBe("honest");
  expect(app.onboarded_at).not.toBeNull();
});
