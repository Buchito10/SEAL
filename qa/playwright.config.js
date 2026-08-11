const { defineConfig } = require("@playwright/test");

const baseURL = process.env.BASE_URL || "https://localhost";

module.exports = defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "reports/playwright", open: "never" }],
  ],
  use: {
    baseURL,
    browserName: "chromium",
    channel: "chrome",
    headless: true,
    ignoreHTTPSErrors: baseURL.includes("localhost"),
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
});
