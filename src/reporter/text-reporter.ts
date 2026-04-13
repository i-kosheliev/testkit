import { ScanReport, FileResult, FlakyTestResult, DuplicateTestPair, CodeIssue } from "../scanner/types";

// ─── ANSI Colors (no dependency) ────────────────────────────────────

const isTTY = process.stdout.isTTY === true;

const color = {
  reset: isTTY ? "\x1b[0m" : "",
  bold: isTTY ? "\x1b[1m" : "",
  dim: isTTY ? "\x1b[2m" : "",
  red: isTTY ? "\x1b[31m" : "",
  yellow: isTTY ? "\x1b[33m" : "",
  green: isTTY ? "\x1b[32m" : "",
  cyan: isTTY ? "\x1b[36m" : "",
  magenta: isTTY ? "\x1b[35m" : "",
};

// ─── Public ─────────────────────────────────────────────────────────

export function formatTextReport(report: ScanReport): string {
  const lines: string[] = [];

  lines.push("");
  lines.push(`${color.bold}@iklab/testkit scan report${color.reset}`);
  lines.push("=".repeat(40));
  lines.push("");

  // Per-file issues
  for (const file of report.files) {
    const issues = file.codeIssues;
    const flakyInFile = report.flakyTests.filter((f) => f.filePath === file.filePath);
    const skipped = file.tests.filter((t) => t.skipped);
    const focused = file.tests.filter((t) => t.focused);

    const fileIssueCount = issues.length + flakyInFile.length + skipped.length + focused.length;

    if (file.parseError) {
      lines.push(`${color.red}!${color.reset} ${color.bold}${file.relativePath}${color.reset} ${color.dim}(parse error)${color.reset}`);
      lines.push(`  ${color.red}${file.parseError}${color.reset}`);
      lines.push("");
      continue;
    }

    if (fileIssueCount === 0) continue;

    lines.push(`${color.cyan}>${color.reset} ${color.bold}${file.relativePath}${color.reset} ${color.dim}(${file.tests.length} tests)${color.reset}`);

    // Flaky descriptions
    for (const flaky of flakyInFile) {
      lines.push(`  ${color.yellow}!${color.reset} ${color.yellow}[flaky:${flaky.score}]${color.reset} "${flaky.fullName}" ${color.dim}(line ${flaky.line})${color.reset}`);
      for (const risk of flaky.risks) {
        lines.push(`    ${color.dim}Risk: ${risk}${color.reset}`);
      }
      for (const suggestion of flaky.suggestions) {
        lines.push(`    ${color.dim}-> ${suggestion}${color.reset}`);
      }
    }

    // Code issues
    for (const issue of issues) {
      const icon = issue.type === "no-assertion" ? color.red + "!" + color.reset
        : issue.type === "flaky-code" ? color.yellow + "!" + color.reset
        : color.yellow + "!" + color.reset;

      lines.push(`  ${icon} ${color.yellow}[${issue.type}]${color.reset} ${issue.message} ${color.dim}(line ${issue.line})${color.reset}`);
      lines.push(`    ${color.dim}-> ${issue.suggestion}${color.reset}`);
    }

    // Focused tests
    for (const t of focused) {
      lines.push(`  ${color.red}!${color.reset} ${color.red}[focused]${color.reset} "${t.fullName}" is focused (.only) ${color.dim}(line ${t.line})${color.reset}`);
      lines.push(`    ${color.dim}-> Remove .only before committing${color.reset}`);
    }

    // Skipped tests
    for (const t of skipped) {
      lines.push(`  ${color.yellow}!${color.reset} ${color.yellow}[skipped]${color.reset} "${t.fullName}" is skipped ${color.dim}(line ${t.line})${color.reset}`);
      lines.push(`    ${color.dim}-> Fix or remove skipped test${color.reset}`);
    }

    lines.push("");
  }

  // Cross-file duplicates
  if (report.duplicates.length > 0) {
    lines.push(`${color.magenta}Duplicate test names${color.reset}`);
    for (const dup of report.duplicates) {
      lines.push(`  ${color.yellow}!${color.reset} ${color.dim}Similarity ${(dup.similarity * 100).toFixed(0)}%:${color.reset}`);
      lines.push(`    "${dup.nameA}" ${color.dim}${dup.fileA}:${dup.lineA}${color.reset}`);
      lines.push(`    "${dup.nameB}" ${color.dim}${dup.fileB}:${dup.lineB}${color.reset}`);
    }
    lines.push("");
  }

  // Summary
  const s = report.summary;
  const hasIssues = s.issuesFound > 0 || s.duplicatesFound > 0 || s.flakyTestsFound > 0 || s.focusedTests > 0;
  const summaryColor = hasIssues ? color.yellow : color.green;

  lines.push(`${color.bold}Summary${color.reset}`);
  lines.push(`  ${color.dim}Files scanned:${color.reset}  ${s.filesScanned}`);
  lines.push(`  ${color.dim}Tests found:${color.reset}    ${s.testsFound}`);

  if (s.issuesFound > 0) lines.push(`  ${color.yellow}Code issues:${color.reset}    ${s.issuesFound}`);
  if (s.flakyTestsFound > 0) lines.push(`  ${color.yellow}Flaky tests:${color.reset}    ${s.flakyTestsFound}`);
  if (s.duplicatesFound > 0) lines.push(`  ${color.yellow}Duplicates:${color.reset}     ${s.duplicatesFound}`);
  if (s.skippedTests > 0) lines.push(`  ${color.yellow}Skipped:${color.reset}        ${s.skippedTests}`);
  if (s.focusedTests > 0) lines.push(`  ${color.red}Focused:${color.reset}        ${s.focusedTests}`);

  if (!hasIssues) {
    lines.push(`  ${color.green}No issues found.${color.reset}`);
  }

  lines.push("");

  return lines.join("\n");
}
