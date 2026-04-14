import { readdirSync, statSync, realpathSync } from "node:fs";
import { join, relative, extname, basename } from "node:path";

/** Directories to always skip */
const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".next",
  ".cache",
  ".nuxt",
  ".output",
  "__snapshots__",
]);

/** Default test file extensions */
const TEST_EXTENSIONS = new Set([".ts", ".js", ".tsx", ".jsx", ".mts", ".mjs"]);

/** Default test file patterns (checked against basename) */
const TEST_PATTERNS = [
  /\.test\./,
  /\.spec\./,
  /_test\./,
  /_spec\./,
];

/**
 * Recursively discovers test files in a directory.
 *
 * @param rootDir - Absolute path to scan
 * @param customPattern - Optional regex pattern override (e.g., from --pattern flag)
 * @returns Array of absolute file paths
 */
export function discoverTestFiles(rootDir: string, customPattern?: string): string[] {
  const files: string[] = [];
  const pattern = customPattern ? globToRegex(customPattern) : null;

  walkDir(rootDir, rootDir, files, pattern);

  return files.sort();
}

/** Max recursion depth to prevent stack overflow on deeply nested dirs */
const MAX_DEPTH = 50;

function walkDir(
  dir: string,
  rootDir: string,
  files: string[],
  pattern: RegExp | null,
  visited: Set<string> = new Set(),
  depth: number = 0
): void {
  if (depth > MAX_DEPTH) return;

  // Resolve real path to detect symlink cycles
  let realPath: string;
  try {
    realPath = realpathSync(dir);
  } catch {
    return; // Broken symlink or permission denied
  }

  if (visited.has(realPath)) return; // Symlink cycle detected
  visited.add(realPath);

  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    // Permission denied or inaccessible — skip silently
    return;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".") continue;

    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      walkDir(fullPath, rootDir, files, pattern, visited, depth + 1);
    } else if (entry.isFile()) {
      if (isTestFile(entry.name, pattern)) {
        files.push(fullPath);
      }
    }
  }
}

function isTestFile(filename: string, customPattern: RegExp | null): boolean {
  const ext = extname(filename);
  if (!TEST_EXTENSIONS.has(ext)) return false;

  if (customPattern) {
    return customPattern.test(filename);
  }

  return TEST_PATTERNS.some((p) => p.test(filename));
}

/**
 * Converts a simple glob pattern to regex.
 * Supports: *, ?, {a,b}
 * Examples: "*.test.ts" → /^.*\.test\.ts$/
 */
/** @internal Exported for testing only */
export function globToRegex(glob: string): RegExp {
  let regex = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&") // Escape special regex chars
    .replace(/\*/g, ".*")                   // * → .*
    .replace(/\?/g, ".");                   // ? → .

  // Handle {a,b} brace expansion
  regex = regex.replace(/\\{([^}]+)\\}/g, (_, group) => {
    return `(${group.split(",").join("|")})`;
  });

  return new RegExp(`^${regex}$`);
}

/** Get relative path for display */
export function getRelativePath(filePath: string, rootDir: string): string {
  return relative(rootDir, filePath);
}
