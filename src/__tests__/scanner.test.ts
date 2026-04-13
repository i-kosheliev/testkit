import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseFile } from "../scanner/ast-parser";
import { extractTests } from "../scanner/test-extractor";
import { analyzeCode } from "../scanner/code-analyzer";
import { discoverTestFiles, getRelativePath } from "../scanner/file-discovery";

const FIXTURES = join(__dirname, "fixtures");

function readFixture(name: string): string {
  return readFileSync(join(FIXTURES, name), "utf-8");
}

function parseFixture(name: string) {
  const source = readFixture(name);
  return parseFile(source, name);
}

// ─── AST Parser ─────────────────────────────────────────────────────

describe("ast-parser", () => {
  it("parses a TypeScript file successfully", () => {
    const ast = parseFixture("clean.test.ts");
    expect(ast).not.toBeNull();
    expect((ast as any).body.length).toBeGreaterThan(0);
  });

  it("returns null for invalid syntax", () => {
    const ast = parseFile("const x: string = {{{invalid", "bad.ts");
    expect(ast).toBeNull();
  });

  it("parses TypeScript type annotations", () => {
    const ast = parseFile('const x: string = "hello"; const y: number = 42;', "types.ts");
    expect(ast).not.toBeNull();
  });

  it("parses arrow functions and async/await", () => {
    const ast = parseFile('const fn = async (): Promise<void> => { await fetch("/api"); };', "async.ts");
    expect(ast).not.toBeNull();
  });

  it("parses plain JavaScript files", () => {
    const ast = parseFile('describe("test", function() { it("works", function() { expect(1).toBe(1); }); });', "plain.js");
    expect(ast).not.toBeNull();
  });
});

// ─── Test Extractor ─────────────────────────────────────────────────

describe("test-extractor", () => {
  it("extracts describe/it/test blocks from clean fixture", () => {
    const ast = parseFixture("clean.test.ts")!;
    const tests = extractTests(ast);

    expect(tests.length).toBeGreaterThanOrEqual(4); // 1 describe + 2 it + 1 nested describe + 1 nested it

    const describes = tests.filter((t) => t.type === "describe");
    const its = tests.filter((t) => t.type === "it");

    expect(describes.length).toBeGreaterThanOrEqual(1);
    expect(its.length).toBeGreaterThanOrEqual(3);
  });

  it("builds correct fullName with ancestors", () => {
    const ast = parseFixture("clean.test.ts")!;
    const tests = extractTests(ast);

    const nestedTest = tests.find((t) => t.name === "should handle zero");
    expect(nestedTest).toBeDefined();
    expect(nestedTest!.fullName).toBe("Calculator > edge cases > should handle zero");
    expect(nestedTest!.ancestors).toEqual(["Calculator", "edge cases"]);
  });

  it("detects skipped tests (.skip and x-prefix)", () => {
    const ast = parseFixture("quality-issues.test.ts")!;
    const tests = extractTests(ast);

    const skipped = tests.filter((t) => t.skipped);
    expect(skipped.length).toBeGreaterThanOrEqual(2); // it.skip + xit + xdescribe
  });

  it("detects focused tests (.only)", () => {
    const ast = parseFixture("quality-issues.test.ts")!;
    const tests = extractTests(ast);

    const focused = tests.filter((t) => t.focused);
    expect(focused.length).toBeGreaterThanOrEqual(1); // it.only
    expect(focused[0].name).toContain("process order");
  });

  it("reports correct line numbers", () => {
    const ast = parseFixture("clean.test.ts")!;
    const tests = extractTests(ast);

    // All tests should have line > 0
    for (const test of tests) {
      expect(test.line).toBeGreaterThan(0);
    }
  });

  it("handles test() alongside it()", () => {
    const source = 'test("standalone test", () => { expect(true).toBe(true); });';
    const ast = parseFile(source, "test-fn.ts")!;
    const tests = extractTests(ast);

    expect(tests).toHaveLength(1);
    expect(tests[0].type).toBe("test");
    expect(tests[0].name).toBe("standalone test");
  });
});

// ─── Code Analyzer ──────────────────────────────────────────────────

describe("code-analyzer", () => {
  it("detects setTimeout in test body", () => {
    const ast = parseFixture("flaky.test.ts")!;
    const issues = analyzeCode(ast);

    const timeoutIssue = issues.find((i) => i.message.includes("setTimeout"));
    expect(timeoutIssue).toBeDefined();
    expect(timeoutIssue!.type).toBe("flaky-code");
  });

  it("detects fetch() in test body", () => {
    const ast = parseFixture("flaky.test.ts")!;
    const issues = analyzeCode(ast);

    const fetchIssue = issues.find((i) => i.message.includes("HTTP call"));
    expect(fetchIssue).toBeDefined();
  });

  it("detects Date.now() in test body", () => {
    const ast = parseFixture("flaky.test.ts")!;
    const issues = analyzeCode(ast);

    const dateIssue = issues.find((i) => i.message.includes("Date.now"));
    expect(dateIssue).toBeDefined();
  });

  it("detects Math.random() in test body", () => {
    const ast = parseFixture("flaky.test.ts")!;
    const issues = analyzeCode(ast);

    const randomIssue = issues.find((i) => i.message.includes("Math.random"));
    expect(randomIssue).toBeDefined();
  });

  it("detects missing assertions (no expect)", () => {
    const ast = parseFixture("quality-issues.test.ts")!;
    const issues = analyzeCode(ast);

    const noAssert = issues.find((i) => i.type === "no-assertion");
    expect(noAssert).toBeDefined();
    expect(noAssert!.message).toContain("no expect/assert");
  });

  it("detects conditional assertions", () => {
    const ast = parseFixture("quality-issues.test.ts")!;
    const issues = analyzeCode(ast);

    const conditional = issues.find((i) => i.type === "conditional-assert");
    expect(conditional).toBeDefined();
  });

  it("reports no issues for clean test file", () => {
    const ast = parseFixture("clean.test.ts")!;
    const issues = analyzeCode(ast);

    expect(issues).toHaveLength(0);
  });

  it("includes actionable suggestions", () => {
    const ast = parseFixture("flaky.test.ts")!;
    const issues = analyzeCode(ast);

    for (const issue of issues) {
      expect(issue.suggestion).toBeTruthy();
      expect(issue.suggestion.length).toBeGreaterThan(10);
    }
  });
});

// ─── File Discovery ─────────────────────────────────────────────────

describe("file-discovery", () => {
  it("discovers test files in fixtures directory", () => {
    const files = discoverTestFiles(FIXTURES);

    expect(files.length).toBeGreaterThanOrEqual(3);
    expect(files.every((f) => f.includes(".test."))).toBe(true);
  });

  it("returns sorted file paths", () => {
    const files = discoverTestFiles(FIXTURES);

    for (let i = 1; i < files.length; i++) {
      expect(files[i] >= files[i - 1]).toBe(true);
    }
  });

  it("computes relative path correctly", () => {
    const rel = getRelativePath("/Users/mac/project/src/test.ts", "/Users/mac/project");
    expect(rel).toBe("src/test.ts");
  });

  it("returns empty array for non-existent directory", () => {
    const files = discoverTestFiles("/non/existent/path");
    expect(files).toEqual([]);
  });

  it("excludes node_modules", () => {
    // discoverTestFiles from project root should not include node_modules
    const root = join(__dirname, "../..");
    const files = discoverTestFiles(root);

    const inNodeModules = files.filter((f) => f.includes("node_modules"));
    expect(inNodeModules).toHaveLength(0);
  });
});
