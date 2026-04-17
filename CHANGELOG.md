# Changelog

All notable changes to `@iklab/testkit` will be documented here.
This project adheres to [Semantic Versioning](https://semver.org/).

## [1.2.0] — 2026-04-17

### Added
- **`analyzeTestFile(content)`** — file-level flakiness analysis with structural
  evidence. Unlike `flaky(description)` (pre-flight, keyword-only), this requires
  BOTH a keyword match AND actual source evidence (import, function call, etc.).
  Dramatically reduces false positives on real test files. Flags real HTTP
  clients (`axios`, `fetch`), ORM imports (`prisma`, `sequelize`, `mongoose`,
  `knex`), fixed sleeps (`setTimeout`), `Date.now()`, `Math.random()`,
  `Promise.all`, email dispatch, and shared-state patterns.
  Returns `{ score: 1–10, risks: [{ label, weight, evidence }] }`.
- 11 new tests covering `analyzeTestFile` (structural vs keyword-only distinction,
  score capping, evidence truncation).

### Deprecated
- **`coverage()`** — Jaccard-similarity matching on tokenized strings produces
  too many false positives to be reliable in real projects. Will be removed
  in v2.0. Pair test IDs to requirement IDs explicitly in your test titles or
  metadata instead. A `console.warn` fires once per process.
- **`suggest()`** — keyword-to-generic-advice mapping produces suggestions
  too generic to be actionable. Will be removed in v2.0. For real test-design
  feedback use an LLM-backed service. A `console.warn` fires once per process.

### Notes
- `flaky(description)` is **not** deprecated — it remains useful for pre-flight
  risk scoring of a test case before any code exists. `analyzeTestFile(content)`
  complements it by analyzing written code with higher precision.
- No breaking changes. All deprecated functions still work in v1.x.

## [1.1.2] — prior release

Earlier changes not tracked here.
