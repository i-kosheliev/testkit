# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly.

**Do not open a public issue.** Instead, email **security@iklab.dev** with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact

I will respond within 48 hours and work with you on a fix before public disclosure.

## Scope

This package runs locally in Node.js. It has zero dependencies and makes no network requests. The primary attack surface is denial of service via crafted inputs (e.g., extremely large arrays passed to `detectDuplicates()`).
