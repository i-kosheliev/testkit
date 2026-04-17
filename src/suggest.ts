import type { SuggestionResult } from "./types";

const PATTERNS: { pattern: RegExp; category: string; suggestion: string }[] = [
  { pattern: /^should\s+(create|add|save|insert|post|submit|register|sign.?up)/i, category: "negative", suggestion: "Consider negative case: what happens with invalid or missing input?" },
  { pattern: /^should\s+(update|edit|modify|change|patch)/i, category: "negative", suggestion: "Consider negative case: what if the resource doesn't exist?" },
  { pattern: /^should\s+(delete|remove|destroy)/i, category: "negative", suggestion: "Consider negative case: what if the resource is already deleted?" },
  { pattern: /^should\s+(display|show|render|list|get|fetch|load|read)/i, category: "empty", suggestion: "Consider edge case: what if the result is empty or null?" },
  { pattern: /^should\s+(search|filter|sort|find)/i, category: "boundary", suggestion: "Consider boundary: what about empty query, very long query, or special characters?" },
  { pattern: /login|auth|sign.?in|session|token/i, category: "auth", suggestion: "Consider auth: what if the user is not authenticated or session expired?" },
  { pattern: /upload|file|image|attachment|document/i, category: "file", suggestion: "Consider edge case: what about empty files, oversized files, or unsupported formats?" },
  { pattern: /payment|checkout|order|cart|price|billing/i, category: "error", suggestion: "Consider error handling: what if payment fails or times out?" },
  { pattern: /email|notification|sms|message/i, category: "async", suggestion: "Consider async: what if delivery fails or is delayed?" },
  { pattern: /permission|role|access|admin/i, category: "auth", suggestion: "Consider authorization: what if user lacks required permissions?" },
  { pattern: /pagination|page|scroll|infinite|load.?more/i, category: "boundary", suggestion: "Consider boundary: first page, last page, empty page, page beyond max." },
  { pattern: /concurrent|parallel|simultaneous|race/i, category: "concurrency", suggestion: "Consider concurrency: what if two users perform the same action simultaneously?" },
];

// Generic suggestions when no specific patterns match
const GENERIC: string[] = [
  "Consider negative case: what happens when input is invalid?",
  "Consider edge case: empty or null values.",
  "Consider boundary values: min, max, zero, one.",
  "Consider error handling: what if the operation fails?",
];

let deprecationWarned = false;

/**
 * @deprecated Since v1.2.0. Keyword-to-generic-advice mapping produces
 * suggestions that are too generic to be actionable. Will be removed in v2.0.
 * Use an LLM-backed suggestion service (e.g. CasePilot's score-requirements)
 * for real test-design feedback.
 */
export function suggest(description: string): SuggestionResult {
  if (!deprecationWarned && typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
    deprecationWarned = true;
    console.warn(
      "[@iklab/testkit] suggest() is deprecated and will be removed in v2.0. " +
        "Keyword-based suggestions are too generic for real use. " +
        "See release notes for v1.2.0."
    );
  }
  if (typeof description !== "string" || description.trim().length === 0) {
    return { suggestions: GENERIC, score: GENERIC.length };
  }

  const matched = new Map<string, string>();
  for (const p of PATTERNS) {
    if (p.pattern.test(description) && !matched.has(p.category)) {
      matched.set(p.category, p.suggestion);
    }
  }

  // Always check for missing common aspects
  const lower = description.toLowerCase();
  if (!lower.includes("error") && !lower.includes("fail") && !lower.includes("invalid") && !matched.has("negative")) {
    matched.set("negative", "Consider negative case: what happens with invalid input?");
  }
  if (!lower.includes("empty") && !lower.includes("null") && !lower.includes("zero") && !lower.includes("none") && !matched.has("empty")) {
    matched.set("empty", "Consider edge case: empty, null, or zero values.");
  }
  if (!lower.includes("boundary") && !lower.includes("limit") && !lower.includes("max") && !lower.includes("min") && !matched.has("boundary")) {
    matched.set("boundary", "Consider boundary values for relevant fields.");
  }

  const suggestions = Array.from(matched.values());
  return { suggestions, score: suggestions.length };
}
