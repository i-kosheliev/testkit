import type { DuplicateResult, DuplicateOptions } from "./types";

const MAX_DESCRIPTIONS = 10_000;

const DEFAULT_STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "shall",
  "should", "may", "might", "can", "could", "must", "and", "but", "or",
  "not", "so", "yet", "of", "at", "by", "for", "with", "about", "to",
  "from", "up", "down", "in", "out", "on", "off", "over", "under",
  "then", "once", "when", "where", "why", "how", "this", "that",
  "it", "its", "i", "me", "my", "we", "our", "you", "your",
  "he", "him", "his", "she", "her", "they", "them", "their",
]);

function tokenize(text: string, ignoreCase: boolean, extraStopWords: string[]): Set<string> {
  if (!text || typeof text !== "string") return new Set();

  const stopWords = new Set([...DEFAULT_STOP_WORDS, ...extraStopWords]);

  const normalized = ignoreCase ? text.toLowerCase() : text;
  const words = normalized
    .replace(/[^a-z0-9\s]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stopWords.has(w.toLowerCase()));

  return new Set(words);
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  if (a.size === 0 || b.size === 0) return 0;

  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }

  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Detect duplicate or overlapping test descriptions using Jaccard similarity.
 *
 * Complexity: O(n^2) — for large arrays (>10,000 items) this will throw.
 *
 * @param descriptions - Array of test case titles or descriptions
 * @param options - Threshold, case sensitivity, extra stop words
 * @returns Pairs above threshold, sorted by similarity descending
 */
export function detectDuplicates(
  descriptions: string[],
  options: DuplicateOptions = {},
): DuplicateResult {
  const threshold = Math.max(0, Math.min(1, options.threshold ?? 0.6));
  const ignoreCase = options.ignoreCase ?? true;
  const stopWords = options.stopWords ?? [];

  if (!descriptions || descriptions.length < 2) {
    return { pairs: [], threshold };
  }

  if (descriptions.length > MAX_DESCRIPTIONS) {
    throw new RangeError(
      `detectDuplicates(): input has ${descriptions.length} items, max is ${MAX_DESCRIPTIONS}. ` +
      `O(n^2) comparison would be too slow.`,
    );
  }

  // Coerce non-strings to strings to prevent runtime crashes
  const safe = descriptions.map((d) => (typeof d === "string" ? d : String(d ?? "")));

  const tokenSets = safe.map((d) => tokenize(d, ignoreCase, stopWords));
  const pairs: DuplicateResult["pairs"] = [];

  for (let i = 0; i < safe.length; i++) {
    for (let j = i + 1; j < safe.length; j++) {
      const similarity = jaccardSimilarity(tokenSets[i], tokenSets[j]);
      if (similarity >= threshold) {
        pairs.push({
          indexA: i,
          indexB: j,
          similarity: Math.round(similarity * 100) / 100,
          textA: safe[i],
          textB: safe[j],
        });
      }
    }
  }

  pairs.sort((a, b) => b.similarity - a.similarity);

  return { pairs, threshold };
}
