export const VERSION = "1.2.0";

const DEPRECATED_FUNCTIONS = new Set(["coverage", "suggest"]);

export function isDeprecated(name: string): boolean {
  if (typeof name !== "string" || name.length === 0) {
    return false;
  }
  return DEPRECATED_FUNCTIONS.has(name);
}

export { boundaries } from "./boundaries";
export { flaky } from "./flaky";
export { analyzeTestFile } from "./analyze-file";
export { testEach } from "./test-each";
export { detectDuplicates } from "./duplicates";
export { coverage } from "./coverage";
export { suggest } from "./suggest";

export type { FileAnalysisResult, FileRisk } from "./analyze-file";
export type {
  BoundaryResult,
  NumberOptions,
  StringOptions,
  DateOptions,
  EnumOptions,
  PasswordOptions,
  UrlOptions,
  PhoneOptions,
  FlakinessResult,
  DuplicatePair,
  DuplicateResult,
  DuplicateOptions,
  TestEachOptions,
  TestEachRow,
  CoverageResult,
  CoverageMapping,
  SuggestionResult,
} from "./types";
