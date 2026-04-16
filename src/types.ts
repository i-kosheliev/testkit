/** Result of boundary value generation for a field type. */
export interface BoundaryResult {
  /** Values within the valid equivalence class. */
  valid: unknown[];
  /** Values outside the valid range / malformed. */
  invalid: unknown[];
  /** Values at exact boundaries (min, max, min+1, max-1). */
  boundary: unknown[];
}

/** Options for number boundary generation. */
export interface NumberOptions {
  min?: number;
  max?: number;
}

/** Options for string boundary generation. */
export interface StringOptions {
  minLength?: number;
  maxLength?: number;
}

/** Options for date boundary generation. */
export interface DateOptions {
  min?: string; // ISO date string
  max?: string; // ISO date string
}

/** Options for enum boundary generation. */
export interface EnumOptions {
  values: string[];
}

/** Options for password boundary generation. */
export interface PasswordOptions {
  minLength?: number;
  maxLength?: number;
}

/** Options for url boundary generation. */
export interface UrlOptions {
  requireHttps?: boolean;
}

/** Options for phone boundary generation. */
export interface PhoneOptions {
  format?: "international" | "us";
}

/** Result of flakiness prediction. */
export interface FlakinessResult {
  /** Risk score from 1 (safe) to 10 (very flaky). */
  score: number;
  /** Detected risk patterns. */
  risks: string[];
  /** Actionable suggestions to reduce flakiness. */
  suggestions: string[];
}

/** A pair of duplicate test descriptions. */
export interface DuplicatePair {
  indexA: number;
  indexB: number;
  similarity: number;
  textA: string;
  textB: string;
}

/** Result of duplicate detection. */
export interface DuplicateResult {
  pairs: DuplicatePair[];
  threshold: number;
}

/** Options for duplicate detection. */
export interface DuplicateOptions {
  /** Similarity threshold 0-1. Default: 0.6 */
  threshold?: number;
  /** Case-insensitive comparison. Default: true */
  ignoreCase?: boolean;
  /** Additional stop words to filter. */
  stopWords?: string[];
}

/** Options for testEach formatter. */
export interface TestEachOptions {
  /** Label template for valid values. Use %s for value placeholder. */
  validLabel?: string;
  /** Label template for invalid values. Use %s for value placeholder. */
  invalidLabel?: string;
  /** Label template for boundary values. Use %s for value placeholder. */
  boundaryLabel?: string;
  /** Include boundary values in output. Default: true */
  includeBoundary?: boolean;
}

/** A single test.each row: [label, input, expected]. */
export type TestEachRow = [string, unknown, boolean];

// Coverage
export interface CoverageMapping {
  requirement: string;
  matchedTests: string[];
  covered: boolean;
}

export interface CoverageResult {
  covered: string[];
  uncovered: string[];
  coveragePercent: number;
  mapping: CoverageMapping[];
}

// Suggestions
export interface SuggestionResult {
  suggestions: string[];
  score: number;
}
