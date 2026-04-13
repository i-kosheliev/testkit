import { boundaries } from "../boundaries";

describe("boundaries", () => {
  describe("number", () => {
    it("generates defaults (0-100)", () => {
      const result = boundaries.number();
      expect(result.valid).toContain(50);
      expect(result.invalid).toContain(-1);
      expect(result.invalid).toContain(101);
      expect(result.invalid).toContainEqual(NaN);
      expect(result.invalid).toContainEqual(Infinity);
      expect(result.boundary).toEqual([0, 1, 99, 100]);
    });

    it("respects custom min/max", () => {
      const result = boundaries.number({ min: 10, max: 20 });
      expect(result.valid).toContain(15);
      expect(result.invalid).toContain(9);
      expect(result.invalid).toContain(21);
      expect(result.boundary).toEqual([10, 11, 19, 20]);
    });

    it("handles negative ranges", () => {
      const result = boundaries.number({ min: -50, max: -10 });
      expect(result.invalid).toContain(-51);
      expect(result.invalid).toContain(-9);
      expect(result.boundary).toContain(-50);
      expect(result.boundary).toContain(-10);
    });

    it("includes NaN and Infinity as invalid", () => {
      const result = boundaries.number({ min: 0, max: 120 });
      expect(result.invalid).toContainEqual(NaN);
      expect(result.invalid).toContainEqual(Infinity);
      expect(result.invalid).toContainEqual(-Infinity);
    });
  });

  describe("string", () => {
    it("generates defaults (length 1-255)", () => {
      const result = boundaries.string();
      expect(result.valid).toContain("hello");
      expect(result.invalid).toContain("");
      expect(result.invalid).toContainEqual("x".repeat(256));
      expect(result.boundary).toContainEqual("x");
      expect(result.boundary).toContainEqual("x".repeat(255));
    });

    it("respects custom lengths", () => {
      const result = boundaries.string({ minLength: 3, maxLength: 10 });
      expect(result.invalid).toContainEqual("x".repeat(11));
      expect(result.boundary).toContainEqual("xxx");
      expect(result.boundary).toContainEqual("x".repeat(10));
    });

    it("omits empty string when minLength is 0", () => {
      const result = boundaries.string({ minLength: 0, maxLength: 50 });
      expect(result.invalid).not.toContain("");
    });
  });

  describe("email", () => {
    it("generates valid emails", () => {
      const result = boundaries.email();
      expect(result.valid.length).toBeGreaterThanOrEqual(2);
      expect(result.valid).toContain("user@example.com");
    });

    it("generates invalid emails", () => {
      const result = boundaries.email();
      expect(result.invalid).toContain("");
      expect(result.invalid).toContain("no-at-sign");
      expect(result.invalid).toContain("@missing-local");
      expect(result.invalid).toContain("spaces in@email.com");
    });

    it("generates boundary emails", () => {
      const result = boundaries.email();
      expect(result.boundary).toContain("a@b.c");
      expect(result.boundary.some((v) => typeof v === "string" && v.length > 64)).toBe(true);
    });
  });

  describe("date", () => {
    it("generates defaults", () => {
      const result = boundaries.date();
      expect(result.valid.length).toBe(1);
      expect(result.invalid).toContain("");
      expect(result.invalid).toContain("not-a-date");
      expect(result.boundary.length).toBe(4);
    });

    it("respects custom range", () => {
      const result = boundaries.date({ min: "2025-01-01", max: "2025-12-31" });
      expect(result.boundary).toContain("2025-01-01");
      expect(result.boundary).toContain("2025-12-31");
      expect(result.invalid).toContain("2024-12-31");
      expect(result.invalid).toContain("2026-01-01");
    });

    it("includes format-invalid dates", () => {
      const result = boundaries.date();
      expect(result.invalid).toContain("2025-13-01");
      expect(result.invalid).toContain("2025-02-30");
    });
  });

  describe("boolean", () => {
    it("has true and false as valid", () => {
      const result = boundaries.boolean();
      expect(result.valid).toEqual([true, false]);
    });

    it("has truthy/falsy non-booleans as invalid", () => {
      const result = boundaries.boolean();
      expect(result.invalid).toContain(null);
      expect(result.invalid).toContain(undefined);
      expect(result.invalid).toContain(0);
      expect(result.invalid).toContain(1);
      expect(result.invalid).toContain("");
      expect(result.invalid).toContain("true");
    });
  });

  describe("enum", () => {
    it("returns all values as valid", () => {
      const result = boundaries.enum({ values: ["admin", "user", "guest"] });
      expect(result.valid).toEqual(["admin", "user", "guest"]);
    });

    it("returns invalid enum values", () => {
      const result = boundaries.enum({ values: ["admin", "user"] });
      expect(result.invalid).toContain("");
      expect(result.invalid).toContain("INVALID_VALUE");
      expect(result.invalid).toContain(null);
    });

    it("has first and last as boundary", () => {
      const result = boundaries.enum({ values: ["a", "b", "c"] });
      expect(result.boundary).toEqual(["a", "c"]);
    });

    it("handles empty values", () => {
      const result = boundaries.enum({ values: [] });
      expect(result.valid).toEqual([]);
      expect(result.invalid).toEqual(["", null]);
    });
  });

  describe("url", () => {
    it("generates valid URLs", () => {
      const result = boundaries.url();
      expect(result.valid).toContain("https://example.com");
      expect(result.valid).toContain("http://example.com");
    });

    it("excludes http when requireHttps", () => {
      const result = boundaries.url({ requireHttps: true });
      expect(result.valid).not.toContain("http://example.com");
    });

    it("generates invalid URLs", () => {
      const result = boundaries.url();
      expect(result.invalid).toContain("");
      expect(result.invalid).toContain("not-a-url");
    });

    it("generates boundary URLs", () => {
      const result = boundaries.url();
      expect(result.boundary).toContain("https://a.bc");
      expect(result.boundary.some((v) => typeof v === "string" && v.length > 2000)).toBe(true);
    });
  });

  describe("password", () => {
    it("generates defaults (8-128)", () => {
      const result = boundaries.password();
      expect(result.valid.length).toBeGreaterThan(0);
      expect(result.invalid).toContain("");
    });

    it("includes common weakness patterns as invalid", () => {
      const result = boundaries.password();
      expect(result.invalid).toContain("nouppercase1!");
      expect(result.invalid).toContain("NOLOWERCASE1!");
      expect(result.invalid).toContain("NoSpecialChar1");
      expect(result.invalid).toContain("NoDigits!!abc");
    });

    it("respects custom lengths", () => {
      const result = boundaries.password({ minLength: 12, maxLength: 64 });
      const invalidShort = result.invalid.find(
        (v) => typeof v === "string" && v === "x".repeat(11),
      );
      expect(invalidShort).toBeDefined();
    });
  });

  describe("phone", () => {
    it("generates international format by default", () => {
      const result = boundaries.phone();
      expect(result.valid.some((v) => typeof v === "string" && v.startsWith("+"))).toBe(true);
    });

    it("generates US format", () => {
      const result = boundaries.phone({ format: "us" });
      expect(result.valid).toContain("(555) 123-4567");
    });

    it("includes invalid phones", () => {
      const result = boundaries.phone();
      expect(result.invalid).toContain("");
      expect(result.invalid).toContain("abc");
    });
  });

  describe("uuid", () => {
    it("generates valid UUIDs", () => {
      const result = boundaries.uuid();
      expect(result.valid.length).toBe(2);
      for (const v of result.valid) {
        expect(v).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      }
    });

    it("generates invalid UUIDs", () => {
      const result = boundaries.uuid();
      expect(result.invalid).toContain("");
      expect(result.invalid).toContain("not-a-uuid");
    });

    it("has all-zeros and all-f as boundaries", () => {
      const result = boundaries.uuid();
      expect(result.boundary).toContain("00000000-0000-0000-0000-000000000000");
      expect(result.boundary).toContain("ffffffff-ffff-ffff-ffff-ffffffffffff");
    });
  });

  describe("structure", () => {
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

      for (const result of types) {
        expect(Array.isArray(result.valid)).toBe(true);
        expect(Array.isArray(result.invalid)).toBe(true);
        expect(Array.isArray(result.boundary)).toBe(true);
        expect(result.valid.length).toBeGreaterThan(0);
        expect(result.invalid.length).toBeGreaterThan(0);
      }
    });
  });
});
