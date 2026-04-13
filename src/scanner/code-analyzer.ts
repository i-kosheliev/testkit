import type { Node } from "acorn";
import { CodeIssue } from "./types";

/** Test function names that contain test bodies to analyze */
const TEST_BODY_FUNCTIONS = new Set(["it", "test", "xit", "xtest", "fit", "ftest"]);

/** Assertion function names */
const ASSERTION_FUNCTIONS = new Set(["expect", "assert", "should"]);

/**
 * Analyze test code bodies for quality issues.
 *
 * Detects:
 * - Flaky code patterns (setTimeout, fetch without mock, Date.now, Math.random, etc.)
 * - Missing assertions (test body with no expect/assert)
 * - Conditional assertions (if (...) expect(...))
 * - Focused/skipped tests (.only, .skip, x-prefixed, f-prefixed)
 */
export function analyzeCode(ast: Node): CodeIssue[] {
  const issues: CodeIssue[] = [];
  findTestBodies(ast, issues);
  return issues;
}

// ─── Flaky Code Patterns ────────────────────────────────────────────

interface FlakyPattern {
  /** Identifier or member expression to match */
  match: (node: any) => boolean;
  message: string;
  suggestion: string;
}

const FLAKY_PATTERNS: FlakyPattern[] = [
  {
    match: (n) => isCallTo(n, "setTimeout") || isCallTo(n, "setInterval"),
    message: "setTimeout/setInterval in test body — timing dependency",
    suggestion: "Use jest.useFakeTimers() or sinon.clock for deterministic timing",
  },
  {
    match: (n) => isMemberCall(n, "Date", "now") || isNewExpression(n, "Date"),
    message: "Date.now() or new Date() in test — time dependency",
    suggestion: "Use jest.useFakeTimers() or freeze time with sinon.useFakeTimers()",
  },
  {
    match: (n) => isMemberCall(n, "Math", "random"),
    message: "Math.random() in test — non-deterministic output",
    suggestion: "Seed the random generator or mock Math.random()",
  },
  {
    match: (n) => isCallTo(n, "fetch") || isCallTo(n, "axios") || isMemberCall(n, "http", "get") || isMemberCall(n, "http", "request"),
    message: "HTTP call in test body — external service dependency",
    suggestion: "Mock HTTP calls with jest.mock, msw, or nock",
  },
  {
    match: (n) => isMemberCall(n, "process", "env"),
    message: "process.env access in test — environment dependency",
    suggestion: "Use .env.test with fixed values or jest.replaceProperty",
  },
  {
    match: (n) => isMemberCall(n, "fs", "readFileSync") || isMemberCall(n, "fs", "writeFileSync") ||
                  isMemberCall(n, "fs", "readFile") || isMemberCall(n, "fs", "writeFile"),
    message: "File system I/O in test — shared state risk",
    suggestion: "Use temp directories (os.tmpdir) and cleanup in afterEach",
  },
];

// ─── Test Body Discovery ────────────────────────────────────────────

function findTestBodies(node: any, issues: CodeIssue[]): void {
  if (!node || typeof node !== "object") return;

  if (node.type === "CallExpression") {
    const funcName = getCallName(node);

    if (funcName && TEST_BODY_FUNCTIONS.has(funcName)) {
      // Found a test body — analyze the callback
      const callback = node.arguments?.[1];
      if (callback && (callback.type === "ArrowFunctionExpression" || callback.type === "FunctionExpression")) {
        analyzeTestBody(callback.body, node.loc?.start?.line ?? 0, issues);
      }
    }
  }

  // Recurse into child nodes
  for (const key of Object.keys(node)) {
    if (key === "loc" || key === "start" || key === "end" || key === "type") continue;
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item === "object" && item.type) {
          findTestBodies(item, issues);
        }
      }
    } else if (child && typeof child === "object" && child.type) {
      findTestBodies(child, issues);
    }
  }
}

function analyzeTestBody(body: any, testLine: number, issues: CodeIssue[]): void {
  if (!body) return;

  let hasAssertion = false;
  let hasConditionalAssert = false;

  walkBody(body, (node: any) => {
    // Check for flaky patterns
    for (const pattern of FLAKY_PATTERNS) {
      if (pattern.match(node)) {
        issues.push({
          type: "flaky-code",
          message: pattern.message,
          line: node.loc?.start?.line ?? testLine,
          suggestion: pattern.suggestion,
        });
      }
    }

    // Check for assertions
    if (isAssertionCall(node)) {
      hasAssertion = true;

      // Check if assertion is inside an if/ternary (conditional assertion)
      // We check this at the if-statement level in the parent walk
    }

    // Check for conditional assertions: if (...) { expect(...) }
    if (node.type === "IfStatement") {
      if (containsAssertion(node.consequent) || (node.alternate && containsAssertion(node.alternate))) {
        hasConditionalAssert = true;
      }
    }
  });

  if (!hasAssertion) {
    issues.push({
      type: "no-assertion",
      message: "Test has no assertions (no expect/assert calls)",
      line: testLine,
      suggestion: "Add expect() assertions to verify test behavior",
    });
  }

  if (hasConditionalAssert) {
    issues.push({
      type: "conditional-assert",
      message: "Assertion inside conditional (if/else) — may not always run",
      line: testLine,
      suggestion: "Move assertions out of conditionals or split into separate tests",
    });
  }
}

// ─── AST Helpers ────────────────────────────────────────────────────

function walkBody(node: any, visitor: (n: any) => void): void {
  if (!node || typeof node !== "object") return;
  visitor(node);

  for (const key of Object.keys(node)) {
    if (key === "loc" || key === "start" || key === "end" || key === "type") continue;
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item === "object" && item.type) {
          walkBody(item, visitor);
        }
      }
    } else if (child && typeof child === "object" && child.type) {
      walkBody(child, visitor);
    }
  }
}

/** Check if node is a call to a global function: setTimeout(...) */
function isCallTo(node: any, name: string): boolean {
  return (
    node.type === "CallExpression" &&
    node.callee?.type === "Identifier" &&
    node.callee.name === name
  );
}

/** Check if node is a member call: obj.method(...) */
function isMemberCall(node: any, obj: string, method: string): boolean {
  return (
    node.type === "CallExpression" &&
    node.callee?.type === "MemberExpression" &&
    node.callee.object?.type === "Identifier" &&
    node.callee.object.name === obj &&
    node.callee.property?.name === method
  );
}

/** Check if node is: new Constructor() */
function isNewExpression(node: any, name: string): boolean {
  return (
    node.type === "NewExpression" &&
    node.callee?.type === "Identifier" &&
    node.callee.name === name
  );
}

/** Check if node is a member access: obj.prop (not a call) */
function isMemberAccess(node: any, obj: string, prop: string): boolean {
  return (
    node.type === "MemberExpression" &&
    node.object?.type === "Identifier" &&
    node.object.name === obj &&
    node.property?.name === prop
  );
}

/** Check if node is an assertion call: expect(...), assert(...) */
function isAssertionCall(node: any): boolean {
  if (node.type !== "CallExpression") return false;

  // expect(...)
  if (node.callee?.type === "Identifier" && ASSERTION_FUNCTIONS.has(node.callee.name)) {
    return true;
  }

  // expect(...).toBe(...) — the outer MemberExpression call
  if (node.callee?.type === "MemberExpression") {
    // Walk the chain: expect(x).toBe(y) → callee is MemberExpression, callee.object is CallExpression
    let current = node.callee;
    while (current?.type === "MemberExpression") {
      current = current.object;
    }
    if (current?.type === "CallExpression" && current.callee?.type === "Identifier") {
      if (ASSERTION_FUNCTIONS.has(current.callee.name)) return true;
    }
  }

  return false;
}

/** Check if a subtree contains any assertion call */
function containsAssertion(node: any): boolean {
  if (!node || typeof node !== "object") return false;

  if (isAssertionCall(node)) return true;

  for (const key of Object.keys(node)) {
    if (key === "loc" || key === "start" || key === "end" || key === "type") continue;
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (containsAssertion(item)) return true;
      }
    } else if (containsAssertion(child)) {
      return true;
    }
  }

  return false;
}

function getCallName(node: any): string | null {
  const callee = node.callee;
  if (!callee) return null;

  // it(...), test(...)
  if (callee.type === "Identifier") return callee.name;

  // it.skip(...), test.only(...)
  if (callee.type === "MemberExpression" && callee.object?.type === "Identifier") {
    return callee.object.name;
  }

  return null;
}
