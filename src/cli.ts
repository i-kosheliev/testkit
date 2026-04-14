/**
 * @iklab/testkit CLI — Static Test Quality Scanner
 *
 * Usage: npx @iklab/testkit scan ./tests [options]
 *
 * Scans test files for flakiness patterns, duplicate descriptions,
 * missing assertions, and other quality issues.
 */

import { readFileSync, statSync } from "node:fs";
import { resolve, isAbsolute } from "node:path";

/** Max file size to read (5MB) — prevents OOM on huge generated files */
const MAX_FILE_SIZE = 5 * 1024 * 1024;
import { discoverTestFiles, getRelativePath } from "./scanner/file-discovery";
import { parseFile } from "./scanner/ast-parser";
import { extractTests } from "./scanner/test-extractor";
import { analyzeCode } from "./scanner/code-analyzer";
import { flaky } from "./flaky";
import { detectDuplicates } from "./duplicates";
import { formatTextReport } from "./reporter/text-reporter";
import { formatJsonReport } from "./reporter/json-reporter";
import type {
  ScanOptions,
  ScanReport,
  FileResult,
  FlakyTestResult,
  DuplicateTestPair,
  ExtractedTest,
} from "./scanner/types";

// ─── CLI Entry Point ────────────────────────────────────────────────

function main(): void {
  const args = process.argv.slice(2);

  // Help
  if (args.includes("--help") || args.includes("-h") || args.length === 0) {
    printHelp();
    process.exit(0);
  }

  // Version
  if (args.includes("--version") || args.includes("-v")) {
    printVersion();
    process.exit(0);
  }

  // Parse command
  const command = args[0];
  if (command !== "scan") {
    console.error(`Unknown command: ${command}. Use "scan" to analyze test files.`);
    process.exit(2);
  }

  // Parse options
  const options = parseArgs(args.slice(1));

  // Run scan
  try {
    const report = scan(options);
    const output = options.format === "json"
      ? formatJsonReport(report)
      : formatTextReport(report);

    console.log(output);

    // Exit code: 1 if issues found, 0 if clean
    const hasIssues =
      report.summary.issuesFound > 0 ||
      report.summary.duplicatesFound > 0 ||
      report.summary.flakyTestsFound > 0 ||
      report.summary.focusedTests > 0;

    process.exit(hasIssues ? 1 : 0);
  } catch (error: any) {
    console.error(`Fatal error: ${error.message}`);
    process.exit(2);
  }
}

// ─── Scan Orchestration ─────────────────────────────────────────────

function scan(options: ScanOptions): ScanReport {
  const rootDir = isAbsolute(options.dir) ? options.dir : resolve(process.cwd(), options.dir);

  // Phase 1: Discover test files
  const filePaths = discoverTestFiles(rootDir, options.pattern !== "default" ? options.pattern : undefined);

  if (filePaths.length === 0) {
    return emptyReport();
  }

  // Phase 2: Parse and analyze each file
  const files: FileResult[] = [];
  const allTests: Array<ExtractedTest & { filePath: string }> = [];

  for (const filePath of filePaths) {
    const result = analyzeFile(filePath, rootDir, options);
    files.push(result);

    for (const test of result.tests) {
      allTests.push({ ...test, filePath });
    }
  }

  // Phase 3: Flaky description analysis
  const flakyTests: FlakyTestResult[] = [];
  for (const test of allTests) {
    if (test.type === "describe") continue; // Only analyze leaf tests

    const result = flaky(test.fullName);
    if (result.score >= options.threshold) {
      flakyTests.push({
        fullName: test.fullName,
        filePath: test.filePath,
        line: test.line,
        score: result.score,
        risks: result.risks,
        suggestions: result.suggestions,
      });
    }
  }

  // Phase 4: Cross-file duplicate detection
  const duplicates: DuplicateTestPair[] = [];
  if (!options.noDuplicates) {
    const leafTests = allTests.filter((t) => t.type !== "describe");

    if (leafTests.length >= 2) {
      const descriptions = leafTests.map((t) => t.fullName);
      const dupResult = detectDuplicates(descriptions, { threshold: 0.7 });

      for (const pair of dupResult.pairs) {
        const testA = leafTests[pair.indexA];
        const testB = leafTests[pair.indexB];
        duplicates.push({
          nameA: testA.fullName,
          nameB: testB.fullName,
          fileA: getRelativePath(testA.filePath, rootDir),
          lineA: testA.line,
          fileB: getRelativePath(testB.filePath, rootDir),
          lineB: testB.line,
          similarity: pair.similarity,
        });
      }
    }
  }

  // Build summary
  const totalTests = allTests.filter((t) => t.type !== "describe").length;
  const totalCodeIssues = files.reduce((sum, f) => sum + f.codeIssues.length, 0);
  const skippedTests = allTests.filter((t) => t.skipped && t.type !== "describe").length;
  const focusedTests = allTests.filter((t) => t.focused).length;

  return {
    files,
    flakyTests,
    duplicates,
    summary: {
      filesScanned: files.length,
      testsFound: totalTests,
      issuesFound: totalCodeIssues,
      duplicatesFound: duplicates.length,
      flakyTestsFound: flakyTests.length,
      skippedTests,
      focusedTests,
    },
  };
}

function analyzeFile(filePath: string, rootDir: string, options: ScanOptions): FileResult {
  const relativePath = getRelativePath(filePath, rootDir);

  let source: string;
  try {
    const stat = statSync(filePath);
    if (stat.size > MAX_FILE_SIZE) {
      return {
        filePath,
        relativePath,
        tests: [],
        codeIssues: [],
        parseError: `File too large (${(stat.size / 1024 / 1024).toFixed(1)}MB > 5MB limit)`,
      };
    }
    source = readFileSync(filePath, "utf-8");
  } catch {
    return {
      filePath,
      relativePath,
      tests: [],
      codeIssues: [],
      parseError: "Could not read file",
    };
  }

  const ast = parseFile(source, filePath);
  if (!ast) {
    return {
      filePath,
      relativePath,
      tests: [],
      codeIssues: [],
      parseError: "Could not parse file (syntax error or unsupported syntax)",
    };
  }

  const tests = extractTests(ast);
  const codeIssues = options.noCodeAnalysis ? [] : analyzeCode(ast);

  return {
    filePath,
    relativePath,
    tests,
    codeIssues,
  };
}

// ─── Argument Parsing ───────────────────────────────────────────────

function parseArgs(args: string[]): ScanOptions {
  const options: ScanOptions = {
    dir: ".",
    pattern: "default",
    format: "text",
    threshold: 4,
    noDuplicates: false,
    noCodeAnalysis: false,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === "--pattern" && args[i + 1]) {
      options.pattern = args[++i];
    } else if (arg === "--json") {
      options.format = "json";
    } else if (arg === "--threshold" && args[i + 1]) {
      const val = parseInt(args[++i], 10);
      if (val >= 1 && val <= 10) options.threshold = val;
    } else if (arg === "--no-duplicates") {
      options.noDuplicates = true;
    } else if (arg === "--no-code-analysis") {
      options.noCodeAnalysis = true;
    } else if (!arg.startsWith("-")) {
      options.dir = arg;
    }

    i++;
  }

  return options;
}

// ─── Help & Version ─────────────────────────────────────────────────

function printHelp(): void {
  console.log(`
@iklab/testkit — Static Test Quality Scanner

Usage:
  testkit scan <directory> [options]

Options:
  --pattern <glob>     File pattern (default: *.test.{ts,js,tsx,jsx})
  --json               Output JSON instead of text
  --threshold <1-10>   Min flakiness score to report (default: 4)
  --no-duplicates      Skip cross-file duplicate detection
  --no-code-analysis   Skip code body analysis (descriptions only)
  --help, -h           Show this help
  --version, -v        Show version

Examples:
  testkit scan ./src/tests
  testkit scan ./tests --pattern "*.spec.ts" --json
  testkit scan . --threshold 6 --no-duplicates
`);
}

function printVersion(): void {
  try {
    const pkg = JSON.parse(readFileSync(resolve(__dirname, "../package.json"), "utf-8"));
    console.log(`@iklab/testkit v${pkg.version}`);
  } catch {
    console.log("@iklab/testkit");
  }
}

function emptyReport(): ScanReport {
  return {
    files: [],
    flakyTests: [],
    duplicates: [],
    summary: {
      filesScanned: 0,
      testsFound: 0,
      issuesFound: 0,
      duplicatesFound: 0,
      flakyTestsFound: 0,
      skippedTests: 0,
      focusedTests: 0,
    },
  };
}

// Run
main();
