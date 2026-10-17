import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  // This suite needs a separately compiled build with public Auth env vars empty.
  testIgnore: process.env.TEST_AUTH_UNCONFIGURED === "1" ? undefined : "**/unconfigured.spec.ts",
  workers: 1,
  timeout: 60000,
  fullyParallel: false,
  outputDir: "artifacts/browser",
  reporter: "list",
  use: {
    baseURL: process.env.TEST_BASE_URL,
    actionTimeout: 15000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // API failure injection must reach page.route; service workers bypass it in WebKit.
    serviceWorkers: "block",
    launchOptions: { channel: "chrome" },
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 13"],
        defaultBrowserType: "chromium",
        browserName: "chromium",
      },
    },
    ...(process.env.TEST_WEBKIT === "1"
      ? [
          {
            name: "webkit",
            use: {
              ...devices["iPhone 13"],
              browserName: "webkit" as const,
              launchOptions: {},
            },
          },
        ]
      : []),
  ],
});
