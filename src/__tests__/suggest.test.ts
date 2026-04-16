import { suggest } from "../suggest";

describe("suggest", () => {
  it("suggests negative case for create operations", () => {
    const result = suggest("should create a new user");
    expect(result.suggestions.some(s => s.includes("negative"))).toBe(true);
  });

  it("suggests auth for login-related tests", () => {
    const result = suggest("should login with valid credentials");
    expect(result.suggestions.some(s => s.includes("auth"))).toBe(true);
  });

  it("suggests boundary for search operations", () => {
    const result = suggest("should search products by name");
    expect(result.suggestions.some(s => s.includes("boundary") || s.includes("special characters"))).toBe(true);
  });

  it("suggests file edge cases for upload operations", () => {
    const result = suggest("should upload user avatar");
    expect(result.suggestions.some(s => s.includes("file") || s.includes("oversized"))).toBe(true);
  });

  it("suggests error handling for payment operations", () => {
    const result = suggest("should process payment checkout");
    expect(result.suggestions.some(s => s.includes("error") || s.includes("fail"))).toBe(true);
  });

  it("returns generic suggestions for vague descriptions", () => {
    const result = suggest("should work");
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it("returns generic suggestions for empty input", () => {
    const result = suggest("");
    expect(result.suggestions).toHaveLength(4);
  });

  it("score reflects number of suggestions", () => {
    const result = suggest("should create user");
    expect(result.score).toBe(result.suggestions.length);
  });
});
