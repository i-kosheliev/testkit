import { detectDuplicates } from "../duplicates";

describe("detectDuplicates", () => {
  it("detects exact duplicates (similarity = 1.0)", () => {
    const result = detectDuplicates([
      "Login with valid credentials",
      "Login with valid credentials",
    ]);
    expect(result.pairs).toHaveLength(1);
    expect(result.pairs[0].similarity).toBe(1);
  });

  it("detects high-similarity pairs", () => {
    const result = detectDuplicates([
      "Login with valid username and password",
      "Login using valid password and username",
    ]);
    expect(result.pairs.length).toBeGreaterThan(0);
    expect(result.pairs[0].similarity).toBeGreaterThan(0.6);
  });

  it("returns no pairs for completely different texts", () => {
    const result = detectDuplicates([
      "Login with valid credentials",
      "Export CSV report for monthly data",
    ]);
    expect(result.pairs).toHaveLength(0);
  });

  it("handles empty array", () => {
    const result = detectDuplicates([]);
    expect(result.pairs).toHaveLength(0);
  });

  it("handles single item", () => {
    const result = detectDuplicates(["Only one test"]);
    expect(result.pairs).toHaveLength(0);
  });

  it("sorts by similarity descending", () => {
    const result = detectDuplicates([
      "Verify user login works",
      "Verify user logout works",
      "Verify user login works correctly",
    ]);
    if (result.pairs.length >= 2) {
      for (let i = 1; i < result.pairs.length; i++) {
        expect(result.pairs[i].similarity).toBeLessThanOrEqual(result.pairs[i - 1].similarity);
      }
    }
  });

  it("respects custom threshold", () => {
    const low = detectDuplicates(
      ["Login with password", "Login using credentials"],
      { threshold: 0.2 },
    );
    const high = detectDuplicates(
      ["Login with password", "Login using credentials"],
      { threshold: 0.9 },
    );
    expect(low.pairs.length).toBeGreaterThanOrEqual(high.pairs.length);
  });

  it("includes correct indices and text", () => {
    const descriptions = ["First test", "Second test", "First test again"];
    const result = detectDuplicates(descriptions, { threshold: 0.3 });
    for (const pair of result.pairs) {
      expect(pair.textA).toBe(descriptions[pair.indexA]);
      expect(pair.textB).toBe(descriptions[pair.indexB]);
      expect(pair.indexA).toBeLessThan(pair.indexB);
    }
  });

  it("is case-insensitive by default", () => {
    const result = detectDuplicates([
      "Login with Valid Credentials",
      "login with valid credentials",
    ]);
    expect(result.pairs).toHaveLength(1);
    expect(result.pairs[0].similarity).toBe(1);
  });

  it("respects ignoreCase=false", () => {
    const caseSensitive = detectDuplicates(
      ["Login Test", "login test"],
      { ignoreCase: false },
    );
    const caseInsensitive = detectDuplicates(
      ["Login Test", "login test"],
      { ignoreCase: true },
    );
    // Case-sensitive may find lower similarity
    expect(caseInsensitive.pairs.length).toBeGreaterThanOrEqual(caseSensitive.pairs.length);
  });

  it("returns threshold in result", () => {
    const result = detectDuplicates(["a", "b"], { threshold: 0.8 });
    expect(result.threshold).toBe(0.8);
  });

  it("handles many items", () => {
    const descriptions = Array.from({ length: 20 }, (_, i) => `Test case number ${i}`);
    const result = detectDuplicates(descriptions);
    // All are similar (share "test case number") so many pairs expected
    expect(result.pairs.length).toBeGreaterThan(0);
  });

  it("filters stop words for better comparison", () => {
    // Without stop word removal "the" and "a" inflate token count.
    // With stop word removal, shared domain words dominate.
    const result = detectDuplicates([
      "user login password validation test",
      "user login password verification test",
    ]);
    // Tokens (after stop words): {user, login, password, validation, test} vs {user, login, password, verification, test}
    // Jaccard: 4/6 = 0.67 → above 0.6 threshold
    expect(result.pairs.length).toBeGreaterThan(0);
    expect(result.pairs[0].similarity).toBeGreaterThanOrEqual(0.6);
  });
});
