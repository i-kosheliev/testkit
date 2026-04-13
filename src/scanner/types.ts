/** Represents a single test block (describe/it/test) found in a file */
export interface ExtractedTest {
  /** Full test name including parent describes: "Auth > Login > should validate email" */
  fullName: string;
  /** Direct test name from it/test call: "should validate email" */
  name: string;
  /** Line number in source file (1-based) */
  line: number;
  /** "describe" | "it" | "test" */
  type: "describe" | "it" | "test";
  /** Whether test is skipped (.skip, xit, xtest, xdescribe) */
  skipped: boolean;
  /** Whether test is focused (.only, fit, fdescribe) */
  focused: boolean;
  /** Parent describe names (outermost first) */
  ancestors: string[];
}

/** A flaky pattern detected in test code body */
export interface CodeIssue {
  /** Issue category */
  type: "flaky-code" | "no-assertion" | "conditional-assert" | "focused" | "skipped";
  /** Human-readable description */
  message: string;
  /** Line number (1-based) */
  line: number;
  /** Actionable suggestion */
  suggestion: string;
}

/** Results for a single scanned file */
export interface FileResult {
  /** Absolute file path */
  filePath: string;
  /** Relative path for display */
  relativePath: string;
  /** All extracted tests */
  tests: ExtractedTest[];
  /** Code-level issues found */
  codeIssues: CodeIssue[];
  /** Parse errors (file couldn't be parsed) */
  parseError?: string;
}

/** Description-level flakiness result */
export interface FlakyTestResult {
  /** Full test name */
  fullName: string;
  /** File path */
  filePath: string;
  /** Line number */
  line: number;
  /** Flakiness score 1-10 */
  score: number;
  /** Risk patterns detected */
  risks: string[];
  /** Suggestions */
  suggestions: string[];
}

/** Duplicate test pair found across files */
export interface DuplicateTestPair {
  nameA: string;
  nameB: string;
  fileA: string;
  lineA: number;
  fileB: string;
  lineB: number;
  similarity: number;
}

/** Complete scan report */
export interface ScanReport {
  /** Files that were scanned */
  files: FileResult[];
  /** Flaky test descriptions (score >= threshold) */
  flakyTests: FlakyTestResult[];
  /** Duplicate test names across files */
  duplicates: DuplicateTestPair[];
  /** Summary statistics */
  summary: {
    filesScanned: number;
    testsFound: number;
    issuesFound: number;
    duplicatesFound: number;
    flakyTestsFound: number;
    skippedTests: number;
    focusedTests: number;
  };
}

/** CLI options parsed from arguments */
export interface ScanOptions {
  /** Root directory to scan */
  dir: string;
  /** File pattern (e.g., "*.test.ts") */
  pattern: string;
  /** Output format */
  format: "text" | "json";
  /** Minimum flakiness score to report (1-10) */
  threshold: number;
  /** Skip duplicate detection */
  noDuplicates: boolean;
  /** Skip code body analysis */
  noCodeAnalysis: boolean;
}
