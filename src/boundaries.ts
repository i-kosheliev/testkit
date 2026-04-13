import type {
  BoundaryResult,
  NumberOptions,
  StringOptions,
  DateOptions,
  EnumOptions,
  PasswordOptions,
  UrlOptions,
  PhoneOptions,
} from "./types";

function numberBoundaries(opts: NumberOptions = {}): BoundaryResult {
  const min = opts.min ?? 0;
  const max = opts.max ?? 100;

  return {
    valid: [Math.floor((min + max) / 2)],
    invalid: [min - 1, max + 1, NaN, Infinity, -Infinity],
    boundary: [min, min + 1, max - 1, max],
  };
}

function stringBoundaries(opts: StringOptions = {}): BoundaryResult {
  const minLen = opts.minLength ?? 1;
  const maxLen = opts.maxLength ?? 255;

  return {
    valid: ["hello"],
    invalid: [
      ...(minLen > 0 ? [""] : []),
      "x".repeat(maxLen + 1),
    ],
    boundary: [
      "x".repeat(minLen),
      "x".repeat(maxLen),
    ],
  };
}

function emailBoundaries(): BoundaryResult {
  return {
    valid: ["user@example.com", "a@b.co", "user.name+tag@domain.org"],
    invalid: [
      "",
      "no-at-sign",
      "@missing-local",
      "missing-domain@",
      "spaces in@email.com",
      "double@@at.com",
    ],
    boundary: [
      "a@b.c",
      "x".repeat(64) + "@domain.com",
    ],
  };
}

function dateBoundaries(opts: DateOptions = {}): BoundaryResult {
  const minDate = opts.min ? new Date(opts.min) : new Date("2000-01-01");
  const maxDate = opts.max ? new Date(opts.max) : new Date("2099-12-31");

  const dayMs = 86_400_000;

  const midTime = new Date((minDate.getTime() + maxDate.getTime()) / 2);

  return {
    valid: [midTime.toISOString().split("T")[0]],
    invalid: [
      "",
      "not-a-date",
      "2025-13-01",
      "2025-02-30",
      new Date(minDate.getTime() - dayMs).toISOString().split("T")[0],
      new Date(maxDate.getTime() + dayMs).toISOString().split("T")[0],
    ],
    boundary: [
      minDate.toISOString().split("T")[0],
      new Date(minDate.getTime() + dayMs).toISOString().split("T")[0],
      new Date(maxDate.getTime() - dayMs).toISOString().split("T")[0],
      maxDate.toISOString().split("T")[0],
    ],
  };
}

function booleanBoundaries(): BoundaryResult {
  return {
    valid: [true, false],
    invalid: [null, undefined, 0, 1, "", "true", "false"],
    boundary: [true, false],
  };
}

function enumBoundaries(opts: EnumOptions): BoundaryResult {
  if (!opts.values || opts.values.length === 0) {
    return { valid: [], invalid: ["", null], boundary: [] };
  }

  return {
    valid: [...opts.values],
    invalid: ["", "INVALID_VALUE", null],
    boundary: [opts.values[0], opts.values[opts.values.length - 1]],
  };
}

function urlBoundaries(opts: UrlOptions = {}): BoundaryResult {
  const valid: string[] = [
    "https://example.com",
    "https://sub.domain.co.uk/path?q=1",
  ];

  if (!opts.requireHttps) {
    valid.push("http://example.com");
  }

  return {
    valid,
    invalid: [
      "",
      "not-a-url",
      "ftp://files.example.com",
      "://missing-scheme.com",
      "http://",
      "http:// spaces.com",
    ],
    boundary: [
      "https://a.bc",
      "https://example.com/" + "a".repeat(2000),
    ],
  };
}

function passwordBoundaries(opts: PasswordOptions = {}): BoundaryResult {
  const minLen = opts.minLength ?? 8;
  const maxLen = opts.maxLength ?? 128;

  return {
    valid: ["P@ssw0rd!2025", "Str0ng#Pass"],
    invalid: [
      "",
      "x".repeat(minLen - 1),
      "x".repeat(maxLen + 1),
      "nouppercase1!",
      "NOLOWERCASE1!",
      "NoSpecialChar1",
      "NoDigits!!abc",
    ],
    boundary: [
      "A".repeat(Math.max(1, minLen - 3)) + "a1!",
      "A".repeat(Math.max(1, maxLen - 3)) + "a1!",
    ],
  };
}

function phoneBoundaries(opts: PhoneOptions = {}): BoundaryResult {
  const isUs = opts.format === "us";

  return {
    valid: isUs
      ? ["(555) 123-4567", "555-123-4567", "5551234567"]
      : ["+1234567890", "+44 20 7946 0958"],
    invalid: [
      "",
      "abc",
      "123",
      "++1234567890",
      "+1 (555) abc-defg",
    ],
    boundary: [
      isUs ? "2001000000" : "+1000000",
      isUs ? "9999999999" : "+999999999999999",
    ],
  };
}

function uuidBoundaries(): BoundaryResult {
  return {
    valid: [
      "550e8400-e29b-41d4-a716-446655440000",
      "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    ],
    invalid: [
      "",
      "not-a-uuid",
      "550e8400-e29b-41d4-a716",
      "550e8400e29b41d4a716446655440000",
      "ZZZZZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZZZZZZZZZ",
    ],
    boundary: [
      "00000000-0000-0000-0000-000000000000",
      "ffffffff-ffff-ffff-ffff-ffffffffffff",
    ],
  };
}

/** Generate structured boundary / equivalence test data per field type. */
export const boundaries = {
  number: numberBoundaries,
  string: stringBoundaries,
  email: emailBoundaries,
  date: dateBoundaries,
  boolean: booleanBoundaries,
  enum: enumBoundaries,
  url: urlBoundaries,
  password: passwordBoundaries,
  phone: phoneBoundaries,
  uuid: uuidBoundaries,
};
