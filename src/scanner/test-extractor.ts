import type { Node } from "acorn";
import { ExtractedTest } from "./types";

/** Test function names we recognize */
const TEST_FUNCTIONS = new Set(["describe", "it", "test"]);
const SKIP_VARIANTS = new Set(["xdescribe", "xit", "xtest"]);
const FOCUS_VARIANTS = new Set(["fdescribe", "fit", "ftest"]);

/**
 * Extract test blocks (describe/it/test) from an ESTree AST.
 *
 * Handles:
 * - describe("name", () => { ... })
 * - it("name", () => { ... })
 * - test("name", () => { ... })
 * - describe.skip / it.skip / test.skip
 * - describe.only / it.only / test.only
 * - xdescribe / xit / xtest
 * - fdescribe / fit / ftest
 * - Nested describes → builds fullName with " > " separator
 */
export function extractTests(ast: Node): ExtractedTest[] {
  const results: ExtractedTest[] = [];
  walkNode(ast, [], results);
  return results;
}

function walkNode(node: any, ancestors: string[], results: ExtractedTest[]): void {
  if (!node || typeof node !== "object") return;

  if (node.type === "CallExpression") {
    const info = parseTestCall(node);
    if (info) {
      const test: ExtractedTest = {
        fullName: [...ancestors, info.name].join(" > "),
        name: info.name,
        line: node.loc?.start?.line ?? 0,
        type: info.type,
        skipped: info.skipped,
        focused: info.focused,
        ancestors: [...ancestors],
      };
      results.push(test);

      // If it's a describe, recurse into the callback body with this name as ancestor
      if (info.type === "describe" && info.bodyNode) {
        walkNode(info.bodyNode, [...ancestors, info.name], results);
        return; // Don't walk children again
      }
    }
  }

  // Walk all child nodes
  for (const key of Object.keys(node)) {
    if (key === "loc" || key === "start" || key === "end" || key === "type") continue;

    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item === "object" && item.type) {
          walkNode(item, ancestors, results);
        }
      }
    } else if (child && typeof child === "object" && child.type) {
      walkNode(child, ancestors, results);
    }
  }
}

interface TestCallInfo {
  name: string;
  type: "describe" | "it" | "test";
  skipped: boolean;
  focused: boolean;
  bodyNode: any | null; // Callback body for describe blocks
}

function parseTestCall(node: any): TestCallInfo | null {
  const callee = node.callee;
  if (!callee) return null;

  let funcName: string | null = null;
  let skipped = false;
  let focused = false;

  // Case 1: describe("name", fn) / it("name", fn) / test("name", fn)
  if (callee.type === "Identifier") {
    const name = callee.name;
    if (TEST_FUNCTIONS.has(name)) {
      funcName = name;
    } else if (SKIP_VARIANTS.has(name)) {
      funcName = name.replace(/^x/, "");
      skipped = true;
    } else if (FOCUS_VARIANTS.has(name)) {
      funcName = name.replace(/^f/, "");
      focused = true;
    }
  }

  // Case 2: describe.skip("name", fn) / it.only("name", fn) / test.each(...)
  if (callee.type === "MemberExpression" && callee.object?.type === "Identifier") {
    const objName = callee.object.name;
    const propName = callee.property?.name;

    if (TEST_FUNCTIONS.has(objName) || SKIP_VARIANTS.has(objName) || FOCUS_VARIANTS.has(objName)) {
      funcName = TEST_FUNCTIONS.has(objName) ? objName : objName.replace(/^[xf]/, "");

      if (propName === "skip") skipped = true;
      else if (propName === "only") focused = true;
      else if (propName === "each" || propName === "todo") {
        // test.each and test.todo — we still record them
        // For test.each, the actual CallExpression is the outer one
      }
    }
  }

  if (!funcName) return null;

  // Extract test name from first argument (must be a string literal)
  const firstArg = node.arguments?.[0];
  const name = extractStringLiteral(firstArg);
  if (!name) return null;

  // Normalize type
  const type = funcName === "describe" ? "describe" : funcName === "it" ? "it" : "test";

  // For describe blocks, find the callback body for nested extraction
  let bodyNode: any = null;
  if (type === "describe") {
    const callback = node.arguments?.[1];
    if (callback && (callback.type === "ArrowFunctionExpression" || callback.type === "FunctionExpression")) {
      bodyNode = callback.body;
    }
  }

  return { name, type, skipped, focused, bodyNode };
}

/** Extract string value from AST node (string literal or template literal without expressions) */
function extractStringLiteral(node: any): string | null {
  if (!node) return null;

  // "string" or 'string'
  if (node.type === "Literal" && typeof node.value === "string") {
    return node.value;
  }

  // `template string` without expressions
  if (node.type === "TemplateLiteral" && node.expressions.length === 0 && node.quasis.length === 1) {
    return node.quasis[0].value.cooked;
  }

  return null;
}
