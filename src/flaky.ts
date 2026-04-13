import type { FlakinessResult } from "./types";

interface RiskPattern {
  name: string;
  pattern: RegExp;
  weight: number;
  suggestion: string;
}

const RISK_PATTERNS: RiskPattern[] = [
  {
    name: "Timing dependency",
    pattern: /\b(sleep|wait|timeout|delay|settimeout|after \d+|seconds|milliseconds|polling)\b/i,
    weight: 2,
    suggestion: "Use waitFor/polling instead of fixed sleep",
  },
  {
    name: "External API",
    pattern: /\b(fetch|http|api|endpoint|webhook|rest|graphql|external|third.party)\b/i,
    weight: 2,
    suggestion: "Mock external services or use contract tests",
  },
  {
    name: "Database",
    pattern: /\b(db|database|query|sql|seed|migration|transaction|insert|delete from)\b/i,
    weight: 2,
    suggestion: "Use test transactions with rollback or isolated test DB",
  },
  {
    name: "File I/O",
    pattern: /\b(file|read|write|upload|download|disk|fs|path|directory)\b/i,
    weight: 1,
    suggestion: "Use temp directories and cleanup in afterEach",
  },
  {
    name: "Network",
    pattern: /\b(network|dns|socket|connection|proxy|port|tcp|udp)\b/i,
    weight: 2,
    suggestion: "Mock network layer or use localhost-only connections",
  },
  {
    name: "Concurrency",
    pattern: /\b(thread|async|parallel|race|mutex|concurrent|simultaneous|lock)\b/i,
    weight: 2,
    suggestion: "Serialize test execution or use proper synchronization",
  },
  {
    name: "UI animation",
    pattern: /\b(animation|transition|render|scroll|fade|slide|popup|modal|toast|spinner)\b/i,
    weight: 1,
    suggestion: "Disable animations in test environment or use toHaveCSS with retry",
  },
  {
    name: "Email/notification",
    pattern: /\b(email|sms|push|notification|inbox|deliver|message queue)\b/i,
    weight: 2,
    suggestion: "Mock email service in tests",
  },
  {
    name: "Date/time",
    pattern: /\b(timezone|clock|schedule|cron|midnight|now|today|current date|current time|timestamp)\b/i,
    weight: 2,
    suggestion: "Use fake timers (jest.useFakeTimers, sinon.clock)",
  },
  {
    name: "Random/generated",
    pattern: /\b(random|uuid|generate|math\.random|crypto\.random|unique id)\b/i,
    weight: 1,
    suggestion: "Seed random generators or assert on properties, not exact values",
  },
  {
    name: "Environment",
    pattern: /\b(env|config|variable|secret|docker|container|ci|pipeline)\b/i,
    weight: 1,
    suggestion: "Use .env.test with fixed values, avoid host-dependent config",
  },
];

/**
 * Predict flakiness risk of a test case BEFORE automation.
 * Analyzes the test description for known risk patterns.
 *
 * @param description - Test case title or description text
 * @returns Flakiness score (1-10), detected risks, and suggestions
 */
export function flaky(description: string): FlakinessResult {
  if (!description || typeof description !== "string") {
    return { score: 1, risks: [], suggestions: [] };
  }

  let score = 1;
  const risks: string[] = [];
  const suggestions: string[] = [];

  for (const rp of RISK_PATTERNS) {
    if (rp.pattern.test(description)) {
      score += rp.weight;
      risks.push(rp.name);
      suggestions.push(rp.suggestion);
    }
  }

  return {
    score: Math.min(10, Math.max(1, score)),
    risks,
    suggestions,
  };
}
