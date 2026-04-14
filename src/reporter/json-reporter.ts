import { ScanReport } from "../scanner/types";

/**
 * Format scan report as JSON string.
 * Used with --json flag for CI/CD integration.
 */
export function formatJsonReport(report: ScanReport): string {
  return JSON.stringify(report, null, 2);
}
