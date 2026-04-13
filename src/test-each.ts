import type { BoundaryResult, TestEachOptions, TestEachRow } from "./types";

function formatValue(value: unknown): string {
  if (value === null) return "(null)";
  if (value === undefined) return "(undefined)";
  if (typeof value === "string" && value === "") return "(empty)";
  if (typeof value === "number" && isNaN(value)) return "(NaN)";
  if (value === Infinity) return "(Infinity)";
  if (value === -Infinity) return "(-Infinity)";
  return String(value);
}

/**
 * Transform boundaries() output into a test.each-compatible array.
 * Each row: [label, inputValue, expectedValid].
 *
 * Works with Jest test.each, Vitest test.each, and Playwright test.describe.
 */
export function testEach(
  result: BoundaryResult,
  options: TestEachOptions = {},
): TestEachRow[] {
  const {
    validLabel = "accepts valid: %s",
    invalidLabel = "rejects invalid: %s",
    boundaryLabel = "handles boundary: %s",
    includeBoundary = true,
  } = options;

  const rows: TestEachRow[] = [];

  for (const value of result.valid) {
    const label = validLabel.replace("%s", formatValue(value));
    rows.push([label, value, true]);
  }

  for (const value of result.invalid) {
    const label = invalidLabel.replace("%s", formatValue(value));
    rows.push([label, value, false]);
  }

  if (includeBoundary) {
    for (const value of result.boundary) {
      const label = boundaryLabel.replace("%s", formatValue(value));
      rows.push([label, value, true]);
    }
  }

  return rows;
}
