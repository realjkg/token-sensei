// Auto-timestamped report filenames (Ratio v2 Wave 2b). The naming convention is
// user-approved and takes no input: a single UTC instant produces both the PDF
// and XLSX names so a paired download is unambiguous. Format mirrors ISO 8601
// with ':' swapped for '-' (filesystem-safe) and milliseconds dropped, e.g.
//   ratio-report-2026-06-26T14-32-00Z.pdf

export type ReportFormat = 'pdf' | 'xlsx';

const FILENAME_PREFIX = 'ratio-report-';

// Filesystem-safe UTC stamp: 2026-06-26T14-32-00Z (no ':' or fractional secs).
export function reportTimestamp(now: Date = new Date()): string {
  return now.toISOString().replace(/:/g, '-').split('.')[0] + 'Z';
}

export function reportFilename(format: ReportFormat, now: Date = new Date()): string {
  return `${FILENAME_PREFIX}${reportTimestamp(now)}.${format}`;
}

// Single regex the API + tests share, so the contract has one source of truth.
export const REPORT_FILENAME_PATTERN =
  /^ratio-report-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z\.(pdf|xlsx)$/;

