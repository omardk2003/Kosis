import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

// Playwright 1.65 expects chromium build 1254, but this sandbox ships 1243 preinstalled.
// Override with PW_CHROMIUM_PATH; otherwise fall back to the preinstalled binary if present.
const FALLBACK_CHROMIUM =
  "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const executablePath =
  process.env.PW_CHROMIUM_PATH ?? (existsSync(FALLBACK_CHROMIUM) ? FALLBACK_CHROMIUM : undefined);

// Tests only ever run against the local Supabase stack. globalSetup aborts otherwise.
const PORT = 3000;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./tests/setup/assert-local-env.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: [["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "off",
    screenshot: "off",
    video: "off",
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  projects: [
    {
      name: "mobile-360",
      use: {
        ...devices["Pixel 7"],
        browserName: "chromium",
        viewport: { width: 360, height: 640 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "desktop",
      use: { browserName: "chromium", viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 300_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
      PORT: String(PORT),
    },
  },
});
