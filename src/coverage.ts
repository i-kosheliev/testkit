import type { CoverageResult, CoverageMapping } from "./types";

export function coverage(
  tests: string[],
  requirements: string[],
  options?: { threshold?: number }
): CoverageResult {
  const threshold = Math.max(0, Math.min(1, options?.threshold ?? 0.3));

  if (!Array.isArray(tests) || !Array.isArray(requirements)) {
    throw new TypeError("coverage() requires arrays of strings");
  }

  const mapping: CoverageMapping[] = requirements.map((req) => {
    const matchedTests = tests
      .map((test, idx) => ({ test, idx, sim: similarity(req, test) }))
      .filter((m) => m.sim >= threshold)
      .sort((a, b) => b.sim - a.sim)
      .map((m) => m.test);
    return { requirement: req, matchedTests, covered: matchedTests.length > 0 };
  });

  const covered = mapping.filter((m) => m.covered).map((m) => m.requirement);
  const uncovered = mapping.filter((m) => !m.covered).map((m) => m.requirement);
  const coveragePercent = requirements.length > 0
    ? Math.round((covered.length / requirements.length) * 100)
    : 100;

  return { covered, uncovered, coveragePercent, mapping };
}

// Local Jaccard similarity (same algorithm as duplicates.ts but decoupled)
function tokenize(text: string): Set<string> {
  const STOP_WORDS = new Set(["a","an","the","is","are","was","were","be","been","being","have","has","had","do","does","did","will","would","could","should","may","might","shall","can","need","must","to","of","in","for","on","with","at","by","from","as","into","about","between","through","after","before","during","and","but","or","not","no","it","its","this","that","these","those","i","we","you","he","she","they","my","our","your"]);
  return new Set(
    text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 1 && !STOP_WORDS.has(w))
  );
}

function similarity(a: string, b: string): number {
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) if (setB.has(token)) intersection++;
  const union = new Set([...setA, ...setB]).size;
  return union > 0 ? intersection / union : 0;
}
