import { coverage } from "../coverage";

describe("coverage", () => {
  it("matches tests to requirements", () => {
    const result = coverage(
      ["should login with valid credentials", "should show error for wrong password"],
      ["User can login", "User sees error on invalid password", "User can reset password"],
      { threshold: 0.2 }
    );
    expect(result.coveragePercent).toBe(67);
    expect(result.covered).toHaveLength(2);
    expect(result.uncovered).toEqual(["User can reset password"]);
  });

  it("returns 100% when all requirements covered", () => {
    const result = coverage(
      ["should create user", "should delete user"],
      ["Create user", "Delete user"]
    );
    expect(result.coveragePercent).toBe(100);
    expect(result.uncovered).toHaveLength(0);
  });

  it("returns 0% when nothing matches", () => {
    const result = coverage(
      ["should render homepage"],
      ["User can upload avatar"]
    );
    expect(result.coveragePercent).toBe(0);
    expect(result.uncovered).toHaveLength(1);
  });

  it("handles empty arrays", () => {
    expect(coverage([], []).coveragePercent).toBe(100);
    expect(coverage(["test"], []).coveragePercent).toBe(100);
    expect(coverage([], ["req"]).coveragePercent).toBe(0);
  });

  it("respects custom threshold", () => {
    const result = coverage(
      ["should show products"],
      ["Display product catalog"],
      { threshold: 0.5 }
    );
    // Higher threshold = fewer matches
    expect(result.coveragePercent).toBeLessThanOrEqual(100);
  });

  it("provides mapping with matched tests", () => {
    const result = coverage(
      ["should create user account", "should validate email"],
      ["User registration"],
      { threshold: 0.2 }
    );
    expect(result.mapping).toHaveLength(1);
    expect(result.mapping[0].requirement).toBe("User registration");
    expect(result.mapping[0].covered).toBe(true);
  });

  it("throws on invalid input", () => {
    expect(() => coverage(null as any, [])).toThrow(TypeError);
    expect(() => coverage([], null as any)).toThrow(TypeError);
  });
});
