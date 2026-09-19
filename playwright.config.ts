import { defineConfig, devices } from "@playwright/test";

const rawBasePath = process.env.CRAMZZ_BASE_PATH ?? "/";
const basePath = rawBasePath === "/" ? "/" : `/${rawBasePath.replace(/^\/+|\/+$/g, "")}/`;
const appUrl = `http://127.0.0.1:4173${basePath}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: appUrl,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4173",
    url: appUrl,
    env: { CRAMZZ_BASE_PATH: basePath },
    reuseExistingServer: !process.env.CI,
  },
});
