module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.js"],
  collectCoverageFrom: [
    "src/utils/html.js",
    "src/utils/placeholders.js",
    "src/utils/placeholderRender.js",
    "src/controllers/auth.controller.js",
    "src/middlewares/authJWT.js",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "html", "json-summary"],
};
