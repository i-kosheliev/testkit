/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/__tests__/fixtures/"],
  transformIgnorePatterns: [
    "/node_modules/(?!(@sveltejs/acorn-typescript|acorn)/)",
  ],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
    "node_modules/@sveltejs/acorn-typescript/.+\\.js$": "ts-jest",
  },
};
