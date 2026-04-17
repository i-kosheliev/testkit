/**
 * File-level flakiness analysis with structural evidence.
 *
 * Complements `flaky(description)` which does pre-flight keyword match on test
 * titles. This function takes the full test file content and requires BOTH:
 *   1. A keyword match (user intent)
 *   2. A structural match (actual import or function call)
 *
 * Dramatically reduces false positives compared to keyword-only matching.
 * Example: a test file mentioning "email validation" no longer triggers
 * "Email/notification risk" unless it actually imports nodemailer or similar.
 *
 * Ported from QualityPilot's scoring engine so both projects share the
 * same risk-detection logic.
 */

export interface FileRisk {
  label: string;
  weight: number;
  evidence: string;
}

export interface FileAnalysisResult {
  score: number; // 1-10
  risks: FileRisk[];
}

interface RiskPattern {
  label: string;
  weight: number;
  /** At least one keyword must appear in the file */
  keywords: RegExp;
  /** AND at least one structural signal — import, fn call, etc. */
  structural: RegExp;
  /** Human-readable description of what triggered the risk */
  describe: (match: string) => string;
}

const RISK_PATTERNS: RiskPattern[] = [
  {
    label: "Fixed sleep/timeout",
    weight: 3,
    keywords: /\b(sleep|wait|timeout|delay|setTimeout|setInterval)\b/i,
    structural:
      /(?:setTimeout\s*\(|sleep\s*\(\s*\d|Thread\.sleep|time\.sleep|await\s+(?:new\s+Promise|wait|delay|sleep))/,
    describe: (m) => `Uses fixed-duration wait: ${m.trim().slice(0, 60)}`,
  },
  {
    label: "Network / external API",
    weight: 2,
    keywords: /(http|fetch|request|axios|api|endpoint|url)/i,
    structural:
      /(?:from\s+['"]axios['"]|from\s+['"]node-fetch['"]|from\s+['"]got['"]|\bfetch\s*\(\s*['"`]https?:|axios\.(get|post|put|delete|patch)\s*\(|request\.(get|post)\s*\()/,
    describe: (m) => `Makes real HTTP call: ${m.trim().slice(0, 60)}`,
  },
  {
    label: "Database / ORM",
    weight: 2,
    keywords: /(database|db|query|orm|prisma|sequelize|mongoose|knex)/i,
    structural:
      /(?:from\s+['"]@?prisma|from\s+['"]sequelize|from\s+['"]mongoose|from\s+['"]knex|from\s+['"]typeorm|\.query\s*\(['"`]\s*SELECT|CREATE\s+TABLE|INSERT\s+INTO)/i,
    describe: (m) => `Database access: ${m.trim().slice(0, 60)}`,
  },
  {
    label: "File system I/O",
    weight: 1,
    keywords: /(file|upload|download|path|disk)/i,
    structural:
      /(?:from\s+['"]fs['"]|from\s+['"]fs\/promises['"]|\bfs\.(readFile|writeFile|mkdir|rmSync|unlink)|\bpath\.(join|resolve)\s*\([^)]*\.(json|txt|csv|png))/,
    describe: (m) => `File system operation: ${m.trim().slice(0, 60)}`,
  },
  {
    label: "Email / messaging",
    weight: 2,
    keywords: /(email|mail|notification|sms|inbox|sendgrid)/i,
    structural:
      /(?:from\s+['"]nodemailer|from\s+['"]@sendgrid|from\s+['"]twilio|from\s+['"]postmark|\.sendMail\s*\(|\.send\s*\(\s*\{[^}]*to\s*:)/,
    describe: (m) => `Email/SMS dispatch: ${m.trim().slice(0, 60)}`,
  },
  {
    label: "Date/time dependency",
    weight: 2,
    keywords: /(today|now|current date|timestamp|timezone|midnight)/i,
    structural:
      /(?:new\s+Date\s*\(\s*\)|Date\.now\s*\(|moment\s*\(\s*\)|dayjs\s*\(\s*\)|performance\.now\s*\(|process\.hrtime)/,
    describe: (m) => `Uses current time: ${m.trim().slice(0, 60)}`,
  },
  {
    label: "Random / dynamic data",
    weight: 2,
    keywords: /(random|uuid|generated|unique id)/i,
    structural:
      /(?:Math\.random\s*\(|crypto\.randomUUID\s*\(|crypto\.randomBytes\s*\(|\buuid\s*\(\s*\)|faker\.\w+|require\s*\(\s*['"]uuid)/,
    describe: (m) => `Random/UUID generation: ${m.trim().slice(0, 60)}`,
  },
  {
    label: "Concurrency / race conditions",
    weight: 3,
    keywords: /(concurrent|parallel|race|worker|thread)/i,
    structural:
      /(?:Promise\.all\s*\(|Promise\.race\s*\(|Worker\s*\(|new\s+Worker|child_process|cluster\.fork|spawn\s*\()/,
    describe: (m) => `Concurrent execution: ${m.trim().slice(0, 60)}`,
  },
  {
    label: "UI animation / transitions",
    weight: 1,
    keywords: /(animation|transition|spinner|loading|render)/i,
    structural:
      /(?:waitForAnimation|requestAnimationFrame|\.animate\s*\(|transition-duration|animation-delay|@keyframes)/,
    describe: (m) => `Animation-dependent: ${m.trim().slice(0, 60)}`,
  },
  {
    label: "Shared state / order dependency",
    weight: 2,
    keywords: /(previous|global|shared|static|singleton)/i,
    structural:
      /(?:beforeAll\s*\(|globalThis\.|global\.\w+\s*=|^(?:let|var)\s+\w+(?=.*\b(?:test|it|describe)\s*\()|process\.env\.\w+\s*=)/m,
    describe: (m) => `Shared state: ${m.trim().slice(0, 60)}`,
  },
];

/**
 * Analyze a full test file's source for flakiness risks with structural evidence.
 *
 * Unlike `flaky(description)` which does pre-flight keyword match on a test
 * title (useful before you've written any code), this function requires both
 * keyword match AND actual code evidence (import/fn call/etc). Results are
 * much more accurate on real source files.
 *
 * @param fileContent - The full source of a .test.ts / .spec.ts file
 * @returns Score 1-10 plus list of risks with the evidence that triggered each
 *
 * @example
 * ```ts
 * import fs from 'node:fs';
 * import { analyzeTestFile } from '@iklab/testkit';
 *
 * const content = fs.readFileSync('./user.test.ts', 'utf8');
 * const result = analyzeTestFile(content);
 *
 * if (result.score >= 6) {
 *   console.warn(`High-risk test file (${result.score}/10):`);
 *   for (const risk of result.risks) {
 *     console.warn(`  - ${risk.label}: ${risk.evidence}`);
 *   }
 * }
 * ```
 */
export function analyzeTestFile(fileContent: string): FileAnalysisResult {
  if (!fileContent || typeof fileContent !== "string") {
    return { score: 1, risks: [] };
  }

  let score = 1;
  const risks: FileRisk[] = [];

  for (const pattern of RISK_PATTERNS) {
    if (!pattern.keywords.test(fileContent)) continue;
    const structuralMatch = fileContent.match(pattern.structural);
    if (!structuralMatch) continue;

    score += pattern.weight;
    risks.push({
      label: pattern.label,
      weight: pattern.weight,
      evidence: pattern.describe(structuralMatch[0]),
    });
  }

  return {
    score: Math.min(10, Math.max(1, score)),
    risks,
  };
}
