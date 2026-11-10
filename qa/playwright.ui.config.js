const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "./e2e", testMatch: "workspace.ui.spec.js", timeout: 120_000,
  expect: { timeout: 30_000 }, workers: 1, retries: 0,
  reporter: [["list"], ["html", { outputFolder: "reports/ui", open: "never" }]],
  use: { baseURL: process.env.BASE_URL || "http://127.0.0.1:3000", browserName: "chromium", headless: true, reducedMotion: "reduce", screenshot: "only-on-failure", trace: "retain-on-failure" },
});
