import { expect, test } from "@playwright/test";
import { serviceGet, signIn } from "./helpers";

// The extension's side of an application: a token from /profile, the kit by posting URL, and a
// receipt when the user presses Submit. The extension itself is checked by hand on real postings.
test("an extension token reads the kit and records a receipt, until it's revoked", async ({ page, request }, info) => {
  test.skip(info.project.name !== "desktop", "one pass is enough");
  const stamp = Date.now();
  const email = `e2e-ext-${stamp}@test.local`;
  const jobUrl = "https://careers.example.com/jobs/3/apply";
  await signIn(page, email);

  await page.goto("/profile");
  const section = page.getByRole("region", { name: "Extension & API tokens" });
  await section.getByLabel("Token name").fill(`Laptop ${stamp}`);
  await section.getByRole("button", { name: "Create token" }).click();
  const token = (await section.getByLabel("New token").textContent())!.trim();
  expect(token).toMatch(/^trk_/);
  const auth = { Authorization: `Bearer ${token}` };

  expect((await request.get(`/api/v1/kit?url=${encodeURIComponent(jobUrl)}`)).status()).toBe(401);
  const kitRes = await request.get(`/api/v1/kit?url=${encodeURIComponent(jobUrl)}`, { headers: auth });
  expect(kitRes.status()).toBe(200);
  const kit = await kitRes.json();
  expect(kit.facts.email).toBe(email);
  expect(kit.application).toBeNull();

  const value = `Because of the data team ${stamp}`;
  const receiptRes = await request.post("/api/v1/receipts", {
    headers: auth,
    data: { job_url: jobUrl, answers: [{ section: "Application", label: "Why us?", value }] },
  });
  expect(receiptRes.status()).toBe(201);
  const { application_id } = await receiptRes.json();
  const [app] = (await serviceGet(`applications?select=status,role_title&id=eq.${application_id}`)) as { status: string; role_title: string }[];
  expect(app).toEqual({ status: "applied", role_title: "Data Analyst Intern" });
  const [receipt] = (await serviceGet(`application_submissions?select=source,answers&application_id=eq.${application_id}`)) as {
    source: string; answers: { value: string }[];
  }[];
  expect(receipt.source).toBe("extension");
  expect(receipt.answers[0].value).toBe(value);

  // The posting is tracked now, so the kit names it.
  expect((await (await request.get(`/api/v1/kit?url=${encodeURIComponent(jobUrl)}`, { headers: auth })).json()).application.role).toBe("Data Analyst Intern");

  await section.getByRole("button", { name: `Revoke Laptop ${stamp}` }).click();
  await expect(section.getByRole("button", { name: `Revoke Laptop ${stamp}` })).toHaveCount(0);
  expect((await request.get(`/api/v1/kit?url=${encodeURIComponent(jobUrl)}`, { headers: auth })).status()).toBe(401);
});
