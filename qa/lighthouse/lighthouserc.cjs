const baseURL = (process.env.BASE_URL || "https://localhost").replace(/\/$/, "");

module.exports = {
  ci: {
    collect: {
      url: [`${baseURL}/login`],
      numberOfRuns: 1,
      settings: {
        chromeFlags: "--headless --no-sandbox --ignore-certificate-errors",
      },
    },
    assert: {
      assertions: {
        "categories:accessibility": ["error", { minScore: 0.85 }],
        "categories:best-practices": ["error", { minScore: 0.85 }],
        "categories:performance": ["warn", { minScore: 0.70 }],
        "categories:seo": ["warn", { minScore: 0.80 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "reports/lighthouse",
    },
  },
};
