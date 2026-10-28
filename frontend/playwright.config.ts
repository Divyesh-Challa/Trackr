import { defineConfig, devices } from "@playwright/test";

// Runs against the local Supabase stack (`make db-start`, `make ingest`) and `next dev`.
// Locally it uses the installed Google Chrome; CI installs Playwright's Chromium.
const channel = process.env.CI ? undefined : "chrome";
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  webServer: {
    // CI tests the production build; locally the dev server is quicker to iterate with.
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel, viewport: { width: 1600, height: 1000 } } },
    { name: "mobile", use: { ...devices["Pixel 7"], channel, viewport: { width: 375, height: 800 } } },
  ],
});
