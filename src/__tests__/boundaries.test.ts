import { boundaries } from "../boundaries";

describe("boundaries.number", () => {
  it("generates defaults (0-100)", () => {
    const r = boundaries.number();
    expect(r.valid).toContain(50);
    expect(r.invalid).toContain(-1);
    expect(r.invalid).toContain(101);
    expect(r.invalid).toContainEqual(NaN);
    expect(r.invalid).toContainEqual(Infinity);
    expect(r.invalid).toContainEqual(-Infinity);
    expect(r.boundary).toEqual([0, 1, 99, 100]);
  });

  it("respects custom min/max", () => {
    const r = boundaries.number({ min: 10, max: 20 });
    expect(r.valid).toContain(15);
    expect(r.invalid).toContain(9);
    expect(r.invalid).toContain(21);
    expect(r.boundary).toEqual([10, 11, 19, 20]);
  });

  it("handles negative ranges", () => {
    const r = boundaries.number({ min: -50, max: -10 });
    expect(r.invalid).toContain(-51);
    expect(r.invalid).toContain(-9);
    expect(r.boundary).toContain(-50);
    expect(r.boundary).toContain(-10);
  });

  it("throws when min > max", () => {
    expect(() => boundaries.number({ min: 100, max: 0 })).toThrow(RangeError);
    expect(() => boundaries.number({ min: 100, max: 0 })).toThrow("min (100) must be <= max (0)");
  });

  it("boundary only contains values within [min, max] when min === max", () => {
    const r = boundaries.number({ min: 5, max: 5 });
    // min+1=6 and max-1=4 are outside range, only [5] should remain
    expect(r.boundary).toEqual([5]);
    for (const v of r.boundary) {
      expect(v as number).toBeGreaterThanOrEqual(5);
      expect(v as number).toBeLessThanOrEqual(5);
    }
  });

  it("deduplicates boundary for small ranges (min+1 === max)", () => {
    const r = boundaries.number({ min: 0, max: 1 });
    // [0, 1, 0, 1] → dedupe → [0, 1]
    expect(r.boundary).toEqual([0, 1]);
  });

  it("handles float ranges without duplicate boundaries", () => {
    const r = boundaries.number({ min: 0.5, max: 1.5 });
    const unique = new Set(r.boundary);
    expect(unique.size).toBe(r.boundary.length);
  });

  it("handles min=0 max=0 degenerate case", () => {
    const r = boundaries.number({ min: 0, max: 0 });
    expect(r.valid).toEqual([0]);
    expect(r.boundary).toEqual([0]);
    expect(r.invalid).toContain(-1);
    expect(r.invalid).toContain(1);
  });

  it("calculates midpoint correctly for odd ranges", () => {
    const r = boundaries.number({ min: 0, max: 3 });
    expect(r.valid).toEqual([1]); // Math.floor(1.5) = 1
  });

  it("deduplicates when min+1 equals max-1", () => {
    const r = boundaries.number({ min: 0, max: 2 });
    // raw [0, 1, 1, 2] → dedupe → [0, 1, 2]
    expect(r.boundary).toEqual([0, 1, 2]);
  });
});

describe("boundaries.string", () => {
  it("generates defaults (length 1-255)", () => {
    const r = boundaries.string();
    expect(r.valid[0]).toHaveLength(128); // midpoint of 1-255
    expect(r.invalid).toContain("");
    expect(r.boundary).toContainEqual("x");
    expect(r.boundary).toContainEqual("x".repeat(255));
  });

  it("valid string respects constraints", () => {
    const r = boundaries.string({ minLength: 3, maxLength: 10 });
    const validStr = r.valid[0] as string;
    expect(validStr.length).toBeGreaterThanOrEqual(3);
    expect(validStr.length).toBeLessThanOrEqual(10);
  });

  it("handles maxLength: 0", () => {
    const r = boundaries.string({ minLength: 0, maxLength: 0 });
    expect(r.valid).toContain("");
    expect(r.invalid).toContainEqual("x");
  });

  it("omits empty string from invalid when minLength is 0", () => {
    const r = boundaries.string({ minLength: 0, maxLength: 50 });
    expect(r.invalid).not.toContain("");
  });

  it("throws when minLength > maxLength", () => {
    expect(() => boundaries.string({ minLength: 10, maxLength: 5 })).toThrow(RangeError);
  });

  it("throws when minLength is negative", () => {
    expect(() => boundaries.string({ minLength: -1 })).toThrow(RangeError);
  });

  it("deduplicates boundary when minLength === maxLength", () => {
    const r = boundaries.string({ minLength: 5, maxLength: 5 });
    expect(r.boundary).toEqual(["x".repeat(5)]);
  });

  it("maxLength: 0 boundary is deduplicated", () => {
    const r = boundaries.string({ minLength: 0, maxLength: 0 });
    expect(r.boundary).toEqual([""]);
  });

  it("throws on extremely large maxLength (OOM guard)", () => {
    expect(() => boundaries.string({ maxLength: 100_000_000 })).toThrow(RangeError);
    expect(() => boundaries.string({ maxLength: 100_000_000 })).toThrow("exceeds max");
  });

  it("works with only minLength specified", () => {
    const r = boundaries.string({ minLength: 5 });
    expect((r.valid[0] as string).length).toBeGreaterThanOrEqual(5);
    expect((r.valid[0] as string).length).toBeLessThanOrEqual(255);
  });

  it("works with only maxLength specified", () => {
    const r = boundaries.string({ maxLength: 10 });
    expect((r.valid[0] as string).length).toBeGreaterThanOrEqual(1);
    expect((r.valid[0] as string).length).toBeLessThanOrEqual(10);
  });
});

describe("boundaries.email", () => {
  it("generates valid emails", () => {
    const r = boundaries.email();
    expect(r.valid.length).toBeGreaterThanOrEqual(2);
    expect(r.valid).toContain("user@example.com");
  });

  it("generates all expected invalid patterns", () => {
    const r = boundaries.email();
    expect(r.invalid).toContain("");
    expect(r.invalid).toContain("no-at-sign");
    expect(r.invalid).toContain("@missing-local");
    expect(r.invalid).toContain("missing-domain@");
    expect(r.invalid).toContain("spaces in@email.com");
    expect(r.invalid).toContain("double@@at.com");
  });

  it("has min and max length boundary emails", () => {
    const r = boundaries.email();
    expect(r.boundary).toContain("a@b.c");
    expect(r.boundary.some((v) => typeof v === "string" && v.length > 64)).toBe(true);
  });
});

describe("boundaries.date", () => {
  it("generates defaults", () => {
    const r = boundaries.date();
    expect(r.valid.length).toBe(1);
    expect(r.invalid).toContain("");
    expect(r.invalid).toContain("not-a-date");
    expect(r.boundary.length).toBeGreaterThanOrEqual(2);
  });

  it("respects custom range", () => {
    const r = boundaries.date({ min: "2025-01-01", max: "2025-12-31" });
    expect(r.boundary).toContain("2025-01-01");
    expect(r.boundary).toContain("2025-12-31");
    expect(r.invalid).toContain("2024-12-31");
    expect(r.invalid).toContain("2026-01-01");
  });

  it("throws on invalid min date string", () => {
    expect(() => boundaries.date({ min: "garbage" })).toThrow(RangeError);
    expect(() => boundaries.date({ min: "garbage" })).toThrow('invalid min date "garbage"');
  });

  it("throws on invalid max date string", () => {
    expect(() => boundaries.date({ max: "not-a-date" })).toThrow(RangeError);
  });

  it("throws when min > max", () => {
    expect(() => boundaries.date({ min: "2026-01-01", max: "2025-01-01" })).toThrow(RangeError);
  });

  it("deduplicates boundary for single-day range", () => {
    const r = boundaries.date({ min: "2025-06-15", max: "2025-06-15" });
    const unique = new Set(r.boundary);
    expect(unique.size).toBe(r.boundary.length);
  });

  it("works with only min specified", () => {
    const r = boundaries.date({ min: "2050-01-01" });
    expect(r.boundary).toContain("2050-01-01");
    expect(r.valid.length).toBe(1);
  });

  it("works with only max specified", () => {
    const r = boundaries.date({ max: "2025-06-30" });
    expect(r.boundary).toContain("2025-06-30");
    expect(r.valid.length).toBe(1);
  });

  it("deduplicates boundary for 2-day range", () => {
    const r = boundaries.date({ min: "2025-06-15", max: "2025-06-16" });
    // min, min+1=max, max-1=min, max → dedupes
    const unique = new Set(r.boundary);
    expect(unique.size).toBe(r.boundary.length);
    expect(r.boundary.length).toBe(2);
  });
});

describe("boundaries.boolean", () => {
  it("has true and false as valid", () => {
    expect(boundaries.boolean().valid).toEqual([true, false]);
  });

  it("has truthy/falsy non-booleans as invalid", () => {
    const r = boundaries.boolean();
    expect(r.invalid).toContain(null);
    expect(r.invalid).toContain(undefined);
    expect(r.invalid).toContain(0);
    expect(r.invalid).toContain(1);
    expect(r.invalid).toContain("");
    expect(r.invalid).toContain("true");
  });
});

describe("boundaries.enum", () => {
  it("returns all values as valid", () => {
    const r = boundaries.enum({ values: ["admin", "user", "guest"] });
    expect(r.valid).toEqual(["admin", "user", "guest"]);
  });

  it("returns invalid enum values", () => {
    const r = boundaries.enum({ values: ["admin", "user"] });
    expect(r.invalid).toContain("");
    expect(r.invalid).toContain("INVALID_VALUE");
    expect(r.invalid).toContain(null);
  });

  it("deduplicates boundary for single-value enum", () => {
    const r = boundaries.enum({ values: ["only"] });
    expect(r.boundary).toEqual(["only"]);
  });

  it("handles empty values", () => {
    const r = boundaries.enum({ values: [] });
    expect(r.valid).toEqual([]);
    expect(r.invalid).toEqual(["", null]);
  });

  it("handles undefined values (JS consumer)", () => {
    const r = boundaries.enum({ values: undefined as unknown as string[] });
    expect(r.valid).toEqual([]);
    expect(r.invalid).toEqual(["", null]);
  });
});

describe("boundaries.url", () => {
  it("generates valid URLs", () => {
    const r = boundaries.url();
    expect(r.valid).toContain("https://example.com");
    expect(r.valid).toContain("http://example.com");
  });

  it("excludes http when requireHttps", () => {
    const r = boundaries.url({ requireHttps: true });
    expect(r.valid).not.toContain("http://example.com");
  });

  it("generates invalid URLs", () => {
    const r = boundaries.url();
    expect(r.invalid).toContain("");
    expect(r.invalid).toContain("not-a-url");
  });

  it("has long URL as boundary", () => {
    const r = boundaries.url();
    expect(r.boundary.some((v) => typeof v === "string" && v.length > 2000)).toBe(true);
  });
});

describe("boundaries.password", () => {
  it("generates defaults (8-128)", () => {
    const r = boundaries.password();
    expect(r.valid.length).toBeGreaterThan(0);
    expect(r.invalid).toContain("");
    // Valid password respects default constraints
    const validPw = r.valid[0] as string;
    expect(validPw.length).toBeGreaterThanOrEqual(8);
    expect(validPw.length).toBeLessThanOrEqual(128);
  });

  it("valid password respects custom constraints", () => {
    const r = boundaries.password({ minLength: 20, maxLength: 30 });
    const validPw = r.valid[0] as string;
    expect(validPw.length).toBeGreaterThanOrEqual(20);
    expect(validPw.length).toBeLessThanOrEqual(30);
  });

  it("valid password respects small constraints", () => {
    const r = boundaries.password({ minLength: 2, maxLength: 4 });
    const validPw = r.valid[0] as string;
    expect(validPw.length).toBeGreaterThanOrEqual(2);
    expect(validPw.length).toBeLessThanOrEqual(4);
  });

  it("includes common weakness patterns as invalid", () => {
    const r = boundaries.password();
    expect(r.invalid).toContain("nouppercase1!");
    expect(r.invalid).toContain("NOLOWERCASE1!");
    expect(r.invalid).toContain("NoSpecialChar1");
    expect(r.invalid).toContain("NoDigits!!abc");
  });

  it("does not crash with minLength: 0", () => {
    expect(() => boundaries.password({ minLength: 0 })).not.toThrow();
    const r = boundaries.password({ minLength: 0 });
    expect(r.boundary.length).toBeGreaterThan(0);
  });

  it("does not crash with minLength: 1", () => {
    expect(() => boundaries.password({ minLength: 1 })).not.toThrow();
  });

  it("throws when minLength > maxLength", () => {
    expect(() => boundaries.password({ minLength: 20, maxLength: 5 })).toThrow(RangeError);
  });

  it("throws when minLength is negative", () => {
    expect(() => boundaries.password({ minLength: -1 })).toThrow(RangeError);
  });

  it("boundary passwords have correct target lengths", () => {
    const r = boundaries.password({ minLength: 12, maxLength: 64 });
    for (const b of r.boundary) {
      const s = b as string;
      expect(s.length === 12 || s.length === 64).toBe(true);
    }
  });

  it("no duplicate values in invalid array", () => {
    const r = boundaries.password({ minLength: 0 });
    const unique = new Set(r.invalid.map(String));
    expect(unique.size).toBe(r.invalid.length);
  });

  it("minLength=0: empty string is in boundary, not invalid", () => {
    const r = boundaries.password({ minLength: 0 });
    expect(r.invalid).not.toContain("");
    expect(r.boundary).toContain("");
  });

  it("minLength=0 maxLength=0: valid is empty string", () => {
    const r = boundaries.password({ minLength: 0, maxLength: 0 });
    expect(r.valid[0]).toBe("");
    expect(r.boundary).toEqual([""]);
  });

  it("buildPassword at exact base length (minLength=4)", () => {
    const r = boundaries.password({ minLength: 4, maxLength: 4 });
    const pw = r.valid[0] as string;
    expect(pw).toHaveLength(4);
    // Should contain mixed chars
    expect(pw).toMatch(/[A-Z]/);
    expect(pw).toMatch(/[a-z]/);
    expect(pw).toMatch(/[0-9]/);
    expect(pw).toMatch(/[^a-zA-Z0-9]/);
  });

  it("short passwords (len < 4) have limited character classes", () => {
    // This is expected: you can't fit 4 character classes in 1-3 chars
    const r1 = boundaries.password({ minLength: 1, maxLength: 1 });
    expect((r1.valid[0] as string)).toHaveLength(1);
    const r3 = boundaries.password({ minLength: 3, maxLength: 3 });
    expect((r3.valid[0] as string)).toHaveLength(3);
  });
});

describe("boundaries.phone", () => {
  it("generates international format by default", () => {
    const r = boundaries.phone();
    expect(r.valid.some((v) => typeof v === "string" && v.startsWith("+"))).toBe(true);
  });

  it("generates US format", () => {
    const r = boundaries.phone({ format: "us" });
    expect(r.valid).toContain("(555) 123-4567");
  });

  it("includes invalid phones", () => {
    const r = boundaries.phone();
    expect(r.invalid).toContain("");
    expect(r.invalid).toContain("abc");
    expect(r.invalid).toContain("123");
    expect(r.invalid).toContain("++1234567890");
  });

  it("includes boundary values for international format", () => {
    const r = boundaries.phone();
    expect(r.boundary).toContain("+1000000");
    expect(r.boundary).toContain("+999999999999999");
  });

  it("includes boundary values for US format", () => {
    const r = boundaries.phone({ format: "us" });
    expect(r.boundary).toContain("2001000000");
    expect(r.boundary).toContain("9999999999");
  });
});

describe("boundaries.uuid", () => {
  it("generates valid UUIDs", () => {
    const r = boundaries.uuid();
    for (const v of r.valid) {
      expect(v).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    }
  });

  it("generates invalid UUIDs", () => {
    const r = boundaries.uuid();
    expect(r.invalid).toContain("");
    expect(r.invalid).toContain("not-a-uuid");
  });

  it("has all-zeros and all-f as boundaries", () => {
    const r = boundaries.uuid();
    expect(r.boundary).toContain("00000000-0000-0000-0000-000000000000");
    expect(r.boundary).toContain("ffffffff-ffff-ffff-ffff-ffffffffffff");
  });
});

describe("boundaries — structure", () => {
  it("every type returns valid, invalid, boundary arrays", () => {
    const types = [
      boundaries.number(),
      boundaries.string(),
      boundaries.email(),
      boundaries.date(),
      boundaries.boolean(),
      boundaries.enum({ values: ["a"] }),
      boundaries.url(),
      boundaries.password(),
      boundaries.phone(),
      boundaries.uuid(),
    ];

    for (const r of types) {
      expect(Array.isArray(r.valid)).toBe(true);
      expect(Array.isArray(r.invalid)).toBe(true);
      expect(Array.isArray(r.boundary)).toBe(true);
      expect(r.valid.length).toBeGreaterThan(0);
      expect(r.invalid.length).toBeGreaterThan(0);
    }
  });
});
