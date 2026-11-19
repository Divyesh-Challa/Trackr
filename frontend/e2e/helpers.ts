import { expect, type Page } from "@playwright/test";

export const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

/**
 * Signs in through the real magic-link flow, reading the email from local Mailpit.
 * New accounts land on onboarding first; that's skipped unless `stayOnOnboarding` is set.
 */
export async function signIn(page: Page, email: string, { stayOnOnboarding = false } = {}) {
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
  await expect(page).toHaveURL(/\/onboarding/);
  if (stayOnOnboarding) return;
  await page.getByRole("button", { name: "Skip setup for now" }).click();
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

export async function servicePost(path: string, body: unknown) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Set SUPABASE_SERVICE_ROLE_KEY (from `supabase status`) to run e2e tests");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

/** The auth user id for an email; tests run in parallel, so "newest profile" can be someone else's. */
export async function userIdFor(email: string): Promise<string> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Set SUPABASE_SERVICE_ROLE_KEY (from `supabase status`) to run e2e tests");
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`admin/users: ${res.status} ${await res.text()}`);
  const { users } = (await res.json()) as { users: { id: string; email: string }[] };
  const user = users.find((u) => u.email === email);
  if (!user) throw new Error(`No user ${email}`);
  return user.id;
}
