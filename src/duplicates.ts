import type { DuplicateResult, DuplicateOptions } from "./types";

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
  if (!text) return new Set();

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
 * @param descriptions - Array of test case titles or descriptions
 * @param options - Threshold, case sensitivity, extra stop words
 * @returns Pairs above threshold, sorted by similarity descending
 */
export function detectDuplicates(
  descriptions: string[],
  options: DuplicateOptions = {},
): DuplicateResult {
  const {
    threshold = 0.6,
    ignoreCase = true,
    stopWords = [],
  } = options;

  if (!descriptions || descriptions.length < 2) {
    return { pairs: [], threshold };
  }

  const tokenSets = descriptions.map((d) => tokenize(d, ignoreCase, stopWords));
  const pairs: DuplicateResult["pairs"] = [];

  for (let i = 0; i < descriptions.length; i++) {
    for (let j = i + 1; j < descriptions.length; j++) {
      const similarity = jaccardSimilarity(tokenSets[i], tokenSets[j]);
      if (similarity >= threshold) {
        pairs.push({
          indexA: i,
          indexB: j,
          similarity: Math.round(similarity * 100) / 100,
          textA: descriptions[i],
          textB: descriptions[j],
        });
      }
    }
  }

  pairs.sort((a, b) => b.similarity - a.similarity);

  return { pairs, threshold };
}
