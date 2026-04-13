# @iklab/testkit

[![npm version](https://img.shields.io/npm/v/@iklab/testkit)](https://www.npmjs.com/package/@iklab/testkit)
[![CI](https://github.com/i-kosheliev/testkit/actions/workflows/ci.yml/badge.svg)](https://github.com/i-kosheliev/testkit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@iklab/testkit)](https://bundlephobia.com/package/@iklab/testkit)

**Stop guessing edge cases.** Structured test data for developers who write tests.

Boundary values, flakiness prediction, duplicate detection. TypeScript-first, zero dependencies.

## Install

```bash
npm install @iklab/testkit
```

## Quick Start

```ts
import { boundaries, testEach } from '@iklab/testkit';

// Generate boundary test data for email validation
const cases = testEach(boundaries.email(), {
  validLabel: 'accepts %s',
  invalidLabel: 'rejects %s',
});

test.each(cases)('%s', (label, input, expected) => {
  expect(validateEmail(input)).toBe(expected);
});
```

One import. Every edge case covered. Copy-paste into your test file.

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

**Supported types:** `number`, `string`, `email`, `date`, `boolean`, `enum`, `url`, `password`, `phone`, `uuid`

### `flaky()` — Predict Flakiness Risk

Score a test case for flakiness risk **before** you automate it. Detects 11 risk patterns.

```ts
import { flaky } from '@iklab/testkit';

flaky('Wait 3 seconds then check if email arrived')
// { score: 6,
//   risks: ['Timing dependency', 'Email/notification'],
//   suggestions: ['Use waitFor/polling instead of fixed sleep',
//                  'Mock email service in tests'] }

flaky('Calculate sum of two numbers')
// { score: 1, risks: [], suggestions: [] }
```

**Risk patterns:** Timing, External API, Database, File I/O, Network, Concurrency, UI animation, Email/notification, Date/time, Random/generated, Environment

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
  'Login with valid credentials',
  'Submit form with empty fields',
  'Login with valid username and password',
])
// { pairs: [{ indexA: 0, indexB: 2, similarity: 0.71,
//             textA: 'Login with valid credentials',
//             textB: 'Login with valid username and password' }],
//   threshold: 0.6 }
```

Options: `{ threshold?: number, ignoreCase?: boolean, stopWords?: string[] }`

## How It Compares

| Feature | @iklab/testkit | faker.js | fast-check |
|---------|---------------|----------|------------|
| Boundary values | Yes | No | No |
| Equivalence partitioning | Yes | No | No |
| Flakiness prediction | Yes | No | No |
| Duplicate detection | Yes | No | No |
| test.each integration | Yes | No | No |
| Random data | No | Yes | Yes (property-based) |
| Zero dependencies | Yes | No | No |

**faker.js** generates random plausible data. **fast-check** generates random inputs for property-based testing. **@iklab/testkit** generates structured, deterministic test data using ISTQB techniques. They solve different problems and complement each other.

## See Also

- **[CasePilot](https://iklab.dev)** — AI-powered test case generation from User Stories (Azure DevOps, Jira)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
