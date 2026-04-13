import { boundaries } from "../boundaries";
import { testEach } from "../test-each";

describe("testEach", () => {
  it("transforms email boundaries into test.each rows", () => {
    const rows = testEach(boundaries.email());
    expect(rows.length).toBeGreaterThan(5);
    for (const row of rows) {
      expect(row).toHaveLength(3);
      expect(typeof row[0]).toBe("string");
      expect(typeof row[2]).toBe("boolean");
    }
  });

  it("marks valid values as expected=true", () => {
    const rows = testEach(boundaries.email());
    const validRows = rows.filter(([label]) => label.startsWith("accepts"));
    expect(validRows.length).toBeGreaterThan(0);
    for (const [, , expected] of validRows) {
      expect(expected).toBe(true);
    }
  });

  it("marks invalid values as expected=false", () => {
    const rows = testEach(boundaries.email());
    const invalidRows = rows.filter(([label]) => label.startsWith("rejects"));
    expect(invalidRows.length).toBeGreaterThan(0);
    for (const [, , expected] of invalidRows) {
      expect(expected).toBe(false);
    }
  });

  it("marks boundary values as expected=true", () => {
    const rows = testEach(boundaries.number({ min: 0, max: 100 }));
    const boundaryRows = rows.filter(([label]) => label.startsWith("handles boundary"));
    expect(boundaryRows.length).toBeGreaterThan(0);
    for (const [, , expected] of boundaryRows) {
      expect(expected).toBe(true);
    }
  });

  it("uses custom labels", () => {
    const rows = testEach(boundaries.email(), {
      validLabel: "valid email: %s",
      invalidLabel: "bad email: %s",
    });
    expect(rows.some(([label]) => label.startsWith("valid email:"))).toBe(true);
    expect(rows.some(([label]) => label.startsWith("bad email:"))).toBe(true);
  });

  it("excludes boundary when includeBoundary=false", () => {
    const withBoundary = testEach(boundaries.number());
    const without = testEach(boundaries.number(), { includeBoundary: false });
    expect(without.length).toBeLessThan(withBoundary.length);
    expect(without.some(([label]) => label.includes("boundary"))).toBe(false);
  });

  it("formats null as (null)", () => {
    const rows = testEach(boundaries.boolean());
    expect(rows.some(([label]) => label.includes("(null)"))).toBe(true);
  });

  it("formats empty string as (empty)", () => {
    const rows = testEach(boundaries.email());
    expect(rows.some(([label]) => label.includes("(empty)"))).toBe(true);
  });

  it("formats NaN as (NaN)", () => {
    const rows = testEach(boundaries.number());
    expect(rows.some(([label]) => label.includes("(NaN)"))).toBe(true);
  });

  it("formats undefined as (undefined)", () => {
    const rows = testEach(boundaries.boolean());
    expect(rows.some(([label]) => label.includes("(undefined)"))).toBe(true);
  });

  it("formats -Infinity as (-Infinity)", () => {
    const rows = testEach(boundaries.number());
    expect(rows.some(([label]) => label.includes("(-Infinity)"))).toBe(true);
  });

  it("works with all boundary types", () => {
    const types = [
      boundaries.number(),
      boundaries.string(),
      boundaries.email(),
      boundaries.boolean(),
      boundaries.enum({ values: ["a", "b"] }),
      boundaries.url(),
      boundaries.uuid(),
    ];

    for (const type of types) {
      const rows = testEach(type);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row).toHaveLength(3);
      }
    }
  });

  it("throws descriptive error on null input", () => {
    expect(() => testEach(null as never)).toThrow(TypeError);
    expect(() => testEach(null as never)).toThrow("BoundaryResult");
  });

  it("throws descriptive error on empty object input", () => {
    expect(() => testEach({} as never)).toThrow(TypeError);
  });

  it("throws descriptive error on undefined input", () => {
    expect(() => testEach(undefined as never)).toThrow(TypeError);
  });

  it("integrates with Jest test.each pattern", () => {
    const cases = testEach(boundaries.number({ min: 1, max: 10 }), {
      validLabel: "validates %s",
      invalidLabel: "rejects %s",
    });
    for (const [label, , expected] of cases) {
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
      expect(typeof expected).toBe("boolean");
    }
  });
});
