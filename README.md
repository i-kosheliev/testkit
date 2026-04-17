# @iklab/testkit

[![npm version](https://img.shields.io/npm/v/@iklab/testkit)](https://www.npmjs.com/package/@iklab/testkit)
[![CI](https://github.com/i-kosheliev/testkit/actions/workflows/ci.yml/badge.svg)](https://github.com/i-kosheliev/testkit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@iklab/testkit)](https://bundlephobia.com/package/@iklab/testkit)

**ISTQB boundary analysis for your `test.each` — without the spreadsheet.**

A toolkit for test automation engineers: boundary values, flakiness prediction, duplicate detection, requirements coverage, test suggestions. TypeScript-first, zero dependencies, 9 KB packed.

Built by a Senior QA Automation Engineer who got tired of re-hardcoding `0, -1, 1, 99, 100, 101` in every test file.

## Install

```bash
npm install @iklab/testkit
```

## Quick Start

### Jest / Vitest

```ts
import { boundaries, testEach } from '@iklab/testkit';

const cases = testEach(boundaries.email(), {
  validLabel: 'accepts %s',
  invalidLabel: 'rejects %s',
});

test.each(cases)('%s', (_label, input, expected) => {
  expect(validateEmail(input)).toBe(expected);
});
```

### Playwright

```ts
import { test, expect } from '@playwright/test';
import { boundaries, testEach } from '@iklab/testkit';

const cases = testEach(boundaries.email(), {
  validLabel: 'accepts %s',
  invalidLabel: 'rejects %s',
});

for (const [label, input, expected] of cases) {
  test(label, async ({ page }) => {
    await page.goto('/signup');
    await page.fill('#email', input);
    await page.click('button[type=submit]');
    if (expected) {
      await expect(page.locator('.error')).toBeHidden();
    } else {
      await expect(page.locator('.error')).toBeVisible();
    }
  });
}
```

One import. Every edge case covered. Works in Jest, Vitest, Playwright, and Cypress.

## Before / After

**Before — 30 lines of hardcoded edge cases per field:**

```ts
test('rejects empty email', () => expect(validate('')).toBe(false));
test('rejects missing @', () => expect(validate('no-at-sign')).toBe(false));
test('rejects missing local', () => expect(validate('@domain.com')).toBe(false));
test('rejects missing domain', () => expect(validate('user@')).toBe(false));
test('rejects spaces', () => expect(validate('a b@c.com')).toBe(false));
test('accepts standard', () => expect(validate('user@example.com')).toBe(true));
// ...20 more lines, and you still forgot the 64-char local-part boundary
```

**After — 5 lines, ISTQB-backed, and boundaries included:**

```ts
const cases = testEach(boundaries.email(), { validLabel: 'ok: %s', invalidLabel: 'bad: %s' });
test.each(cases)('%s', (_, input, expected) => {
  expect(validate(input)).toBe(expected);
});
```

---

**Before — copy-pasted age boundaries across 4 test files:**

```ts
// signup.test.ts
[-1, 0, 17, 18, 65, 120, 121].forEach(age => { /* ... */ });
// profile.test.ts  — same list, copied
// admin.test.ts    — same list, copied, one value wrong
// checkout.test.ts — same list, copied, missing NaN case
```

**After — one source of truth:**

```ts
boundaries.number({ min: 18, max: 120 })
// { valid: [69], invalid: [-1, 17, 121, NaN, Infinity], boundary: [18, 19, 119, 120] }
```

---

**Before — reviewing a flaky test after it fails in CI three times:**

```ts
test('user receives welcome email', async () => {
  await signup(user);
  await sleep(3000);           // fixed wait
  const inbox = await fetchInbox(user.email);  // hits real SMTP
  expect(inbox).toContain('Welcome');
});
```

**After — flag the risk before it reaches CI:**

```ts
flaky('Wait 3 seconds then check if email arrived')
// { score: 5,
//   risks: ['Timing dependency', 'Email/notification'],
//   suggestions: ['Use waitFor/polling instead of fixed sleep',
//                 'Mock email service in tests'] }
```

## API

### `boundaries` — ISTQB Test Data Generation

Generate structured test data using Boundary Value Analysis and Equivalence Partitioning. Returns `{ valid, invalid, boundary }` arrays for each field type.

```ts
import { boundaries } from '@iklab/testkit';

boundaries.email()
// { valid: ['user@example.com', 'a@b.co', ...],
//   invalid: ['', 'no-at-sign', '@missing-local', ...],
//   boundary: ['a@b.c', 'x'.repeat(64)+'@domain.com'] }

boundaries.number({ min: 0, max: 120 })
// { valid: [60],
//   invalid: [-1, 121, NaN, Infinity, -Infinity],
//   boundary: [0, 1, 119, 120] }

boundaries.string({ minLength: 1, maxLength: 50 })
// { valid: ['aaa...'],   // midpoint length (25 chars)
//   invalid: ['', 'x'.repeat(51)],
//   boundary: ['x', 'x'.repeat(50)] }

boundaries.enum({ values: ['admin', 'user', 'guest'] })
// { valid: ['admin', 'user', 'guest'],
//   invalid: ['', 'INVALID_VALUE', null],
//   boundary: ['admin', 'guest'] }
```

**Supported types:** `number`, `string`, `email`, `date`, `boolean`, `enum`, `url`, `password`, `phone`, `uuid`, `custom`

#### Custom field types

Define your own domain-specific validation rules:

```ts
boundaries.custom({
  valid: [18, 25, 65],
  invalid: [-1, 0, 17, 151],
  boundary: [18, 150],
})
// Works with testEach() like any other type
```

### `flaky()` — Predict Flakiness Risk

Score a test case for flakiness risk **before** you automate it. Detects 11 risk patterns.

```ts
import { flaky } from '@iklab/testkit';

flaky('Wait 3 seconds then check if email arrived')
// { score: 5,
//   risks: ['Timing dependency', 'Email/notification'],
//   suggestions: ['Use waitFor/polling instead of fixed sleep',
//                  'Mock email service in tests'] }

flaky('Calculate sum of two numbers')
// { score: 1, risks: [], suggestions: [] }
```

**Risk patterns:** Timing, External API, Database, File I/O, Network, Concurrency, UI animation, Email/notification, Date/time, Random/generated, Environment

### `analyzeTestFile()` — File-level Flakiness with Structural Evidence

Deeper flakiness analysis on **actual source code**, not just a title. Requires BOTH a keyword match AND structural evidence (real import, function call, etc.) — so mentioning "email" in a comment no longer triggers an email-risk flag.

```ts
import fs from 'node:fs';
import { analyzeTestFile } from '@iklab/testkit';

const source = fs.readFileSync('./tests/user.spec.ts', 'utf8');
const result = analyzeTestFile(source);

// { score: 6,
//   risks: [
//     { label: 'Network / external API', weight: 2,
//       evidence: 'Makes real HTTP call: axios.get("https://api..."' },
//     { label: 'Fixed sleep/timeout', weight: 3,
//       evidence: 'Uses fixed-duration wait: setTimeout(r, 500)' }
//   ] }

if (result.score >= 6) {
  console.warn(`High-risk test file (${result.score}/10)`);
  for (const r of result.risks) console.warn(`  ${r.label}: ${r.evidence}`);
}
```

Use `flaky(title)` **before** writing the test (pre-flight on a description). Use `analyzeTestFile(content)` **after** it's written to catch real structural smells — `Promise.all`, `Date.now()`, `Math.random()`, real HTTP clients, ORM imports, and more.

### `testEach()` — Generate test.each Arrays

Transform `boundaries()` output into ready-made `test.each` arrays for Jest, Vitest, or Playwright.

```ts
import { boundaries, testEach } from '@iklab/testkit';

const cases = testEach(boundaries.number({ min: 1, max: 10 }), {
  validLabel: 'validates %s',
  invalidLabel: 'rejects %s',
});

// [['validates 5', 5, true],
//  ['rejects 0', 0, false],
//  ['rejects 11', 11, false],
//  ['rejects (NaN)', NaN, false],
//  ['handles boundary: 1', 1, true],
//  ...]

test.each(cases)('%s', (label, input, expected) => {
  expect(isValidAge(input)).toBe(expected);
});
```

### `detectDuplicates()` — Find Overlapping Tests

Detect duplicate or overlapping test descriptions using Jaccard similarity.

```ts
import { detectDuplicates } from '@iklab/testkit';

detectDuplicates([
  'Verify user login works correctly',
  'Submit form with empty fields',
  'Verify user login works',
])
// { pairs: [{ indexA: 0, indexB: 2, similarity: 0.8,
//             textA: 'Verify user login works correctly',
//             textB: 'Verify user login works' }],
//   threshold: 0.6 }
```

Options: `{ threshold?: number, ignoreCase?: boolean, stopWords?: string[] }`

### `coverage()` — Requirements Coverage Check **[DEPRECATED — removal in v2.0]**

> **Deprecated in v1.2.0.** Jaccard-similarity matching produces too many false positives to be reliable. Pair test IDs to requirement IDs explicitly in your test titles or metadata instead. Will be removed in v2.0.

Check if your tests cover all requirements. Uses text similarity to match test descriptions against requirement statements.

```ts
import { coverage } from '@iklab/testkit';

const result = coverage(
  ['should login with valid credentials', 'should show error for wrong password'],
  ['User can login', 'User sees error on invalid password', 'User can reset password']
);

// { covered: ['User can login', 'User sees error on invalid password'],
//   uncovered: ['User can reset password'],
//   coveragePercent: 67,
//   mapping: [{ requirement: 'User can login', matchedTests: ['should login...'], covered: true }, ...] }
```

Options: `{ threshold?: number }` — similarity threshold (0-1, default 0.3)

### `suggest()` — Test Improvement Suggestions **[DEPRECATED — removal in v2.0]**

> **Deprecated in v1.2.0.** Keyword-to-advice mapping produces suggestions too generic to be actionable. For real test-design feedback use an LLM-backed service (e.g. CasePilot's Requirements Quality scoring). Will be removed in v2.0.

Analyze a test description and get suggestions for missing scenarios. Detects 12 patterns: CRUD operations, auth, file uploads, payments, pagination, concurrency.

```ts
import { suggest } from '@iklab/testkit';

suggest('should create a new user')
// { suggestions: [
//     'Consider negative case: what happens with invalid or missing input?',
//     'Consider edge case: empty, null, or zero values.',
//     'Consider boundary values for relevant fields.'
//   ],
//   score: 3 }

suggest('should upload user avatar')
// { suggestions: [
//     'Consider edge case: what about empty files, oversized files, or unsupported formats?',
//     ...
//   ],
//   score: 4 }
```

## How It Compares

| Feature | @iklab/testkit | faker.js | fast-check |
|---------|---------------|----------|------------|
| Boundary values | Yes | No | No |
| Equivalence partitioning | Yes | No | No |
| Flakiness prediction | Yes | No | No |
| Duplicate detection | Yes | No | No |
| Requirements coverage | Yes | No | No |
| Test suggestions | Yes | No | No |
| test.each integration | Yes | No | No |
| Random data | No | Yes | Yes (property-based) |
| Zero dependencies | Yes | No | No |

**faker.js** generates random plausible data. **fast-check** generates random inputs for property-based testing. **@iklab/testkit** generates structured, deterministic test data using ISTQB techniques. They solve different problems and complement each other.

## See Also

- **[QualityPilot](https://qualitypilot-two.vercel.app)** — GitHub test health scanner (free)
- **[IK Lab](https://iklab.dev)** — AI-powered QA tools

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
