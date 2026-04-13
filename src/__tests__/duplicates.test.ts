import { detectDuplicates } from "../duplicates";

describe("detectDuplicates", () => {
  it("detects exact duplicates (similarity = 1.0)", () => {
    const r = detectDuplicates([
      "Login with valid credentials",
      "Login with valid credentials",
    ]);
    expect(r.pairs).toHaveLength(1);
    expect(r.pairs[0].similarity).toBe(1);
  });

  it("detects high-similarity pairs", () => {
    const r = detectDuplicates([
      "Login with valid username and password",
      "Login using valid password and username",
    ]);
    expect(r.pairs.length).toBeGreaterThan(0);
    expect(r.pairs[0].similarity).toBeGreaterThan(0.6);
  });

  it("returns no pairs for completely different texts", () => {
    const r = detectDuplicates([
      "Login with valid credentials",
      "Export CSV report for monthly data",
    ]);
    expect(r.pairs).toHaveLength(0);
  });

  it("handles empty array", () => {
    expect(detectDuplicates([]).pairs).toHaveLength(0);
  });

  it("handles single item", () => {
    expect(detectDuplicates(["Only one"]).pairs).toHaveLength(0);
  });

  it("handles null/undefined input", () => {
    expect(detectDuplicates(null as unknown as string[]).pairs).toHaveLength(0);
    expect(detectDuplicates(undefined as unknown as string[]).pairs).toHaveLength(0);
  });

  it("sorts by similarity descending", () => {
    const r = detectDuplicates([
      "Verify user login works",
      "Verify user logout works",
      "Verify user login works correctly",
    ]);
    if (r.pairs.length >= 2) {
      for (let i = 1; i < r.pairs.length; i++) {
        expect(r.pairs[i].similarity).toBeLessThanOrEqual(r.pairs[i - 1].similarity);
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

  it("clamps threshold to [0, 1]", () => {
    const negative = detectDuplicates(["a", "b"], { threshold: -1 });
    expect(negative.threshold).toBe(0);

    const overOne = detectDuplicates(["a", "b"], { threshold: 5 });
    expect(overOne.threshold).toBe(1);
  });

  it("includes correct indices and text", () => {
    const descriptions = ["First test", "Second test", "First test again"];
    const r = detectDuplicates(descriptions, { threshold: 0.3 });
    for (const pair of r.pairs) {
      expect(pair.textA).toBe(descriptions[pair.indexA]);
      expect(pair.textB).toBe(descriptions[pair.indexB]);
      expect(pair.indexA).toBeLessThan(pair.indexB);
    }
  });

  it("is case-insensitive by default", () => {
    const r = detectDuplicates([
      "Login with Valid Credentials",
      "login with valid credentials",
    ]);
    expect(r.pairs).toHaveLength(1);
    expect(r.pairs[0].similarity).toBe(1);
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
    expect(caseInsensitive.pairs.length).toBeGreaterThanOrEqual(caseSensitive.pairs.length);
  });

  it("returns threshold in result", () => {
    const r = detectDuplicates(["a", "b"], { threshold: 0.8 });
    expect(r.threshold).toBe(0.8);
  });

  it("handles many items", () => {
    const descriptions = Array.from({ length: 20 }, (_, i) => `Test case number ${i}`);
    const r = detectDuplicates(descriptions);
    expect(r.pairs.length).toBeGreaterThan(0);
  });

  it("throws on input exceeding 10,000 items", () => {
    const huge = Array.from({ length: 10_001 }, (_, i) => `test ${i}`);
    expect(() => detectDuplicates(huge)).toThrow(RangeError);
    expect(() => detectDuplicates(huge)).toThrow("max is 10000");
  });

  it("coerces non-string elements instead of crashing", () => {
    const r = detectDuplicates([123 as unknown as string, null as unknown as string]);
    expect(r.pairs).toBeDefined();
  });

  it("handles all-punctuation descriptions (empty token sets)", () => {
    const r = detectDuplicates(["!@#$", "!@#$"]);
    // Both tokenize to empty sets → similarity 0 → no pairs at default threshold
    expect(r.pairs).toHaveLength(0);
  });

  it("respects custom stopWords option", () => {
    const without = detectDuplicates(
      ["verify login functionality", "verify logout functionality"],
      { threshold: 0.3 },
    );
    const withStop = detectDuplicates(
      ["verify login functionality", "verify logout functionality"],
      { threshold: 0.3, stopWords: ["verify", "functionality"] },
    );
    // After adding stop words, only "login" vs "logout" remain → lower similarity
    expect(withStop.pairs.length).toBeLessThanOrEqual(without.pairs.length);
  });

  it("stop words improve domain comparison", () => {
    const r = detectDuplicates([
      "user login password validation test",
      "user login password verification test",
    ]);
    expect(r.pairs.length).toBeGreaterThan(0);
    expect(r.pairs[0].similarity).toBeGreaterThanOrEqual(0.6);
  });
});
