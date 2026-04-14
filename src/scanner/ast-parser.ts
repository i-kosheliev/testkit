import * as acorn from "acorn";
import { tsPlugin } from "@sveltejs/acorn-typescript";

/**
 * Parse a JavaScript or TypeScript file into an ESTree-compliant AST.
 *
 * Uses acorn with @sveltejs/acorn-typescript plugin for TS/JSX support.
 * Returns null if parsing fails (caller handles gracefully).
 */
export function parseFile(source: string, filename: string): acorn.Node | null {
  const isTypeScript = /\.tsx?$/.test(filename);

  try {
    const parser = isTypeScript
      ? acorn.Parser.extend(tsPlugin() as any)
      : acorn.Parser;

    return parser.parse(source, {
      ecmaVersion: "latest",
      sourceType: "module",
      locations: true,
      // Allow JSX in TSX/JSX files
      ...(isTypeScript ? {} : {}),
    });
  } catch {
    // Parse error — file might have syntax errors or unsupported syntax
    return null;
  }
}
