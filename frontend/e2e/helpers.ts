import { expect, type Page } from "@playwright/test";

export const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

/** Signs in through the real magic-link flow, reading the email from local Mailpit. */
export async function signIn(page: Page, email: string) {
  await page.goto("/login?next=/board");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByText(`Check ${email}`)).toBeVisible();

  let link = "";
  await expect
    .poll(async () => {
      const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
      const { messages = [] } = await res.json();
      if (!messages.length) return false;
      const msg = await (await fetch(`${MAILPIT}/api/v1/message/${messages[0].ID}`)).json();
      link = (msg.Text.match(/https?:\/\/\S+/) ?? [""])[0];
      return Boolean(link);
    }, { timeout: 15_000 })
    .toBe(true);

  await page.goto(link);
  await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();
}

export async function serviceGet(path: string) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Set SUPABASE_SERVICE_ROLE_KEY (from `supabase status`) to run e2e tests");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

export const column = (page: Page, title: string) =>
  page.locator("section", { has: page.getByRole("heading", { name: new RegExp(`^${title}`) }) });
