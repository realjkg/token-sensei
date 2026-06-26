// Tests for the auto-timestamped report filename contract (Ratio v2 Wave 2b).
// The naming convention is user-approved and takes no input, so it gets its own
// focused unit coverage independent of the renderers.
import { describe, it, expect } from 'vitest';
import {
  REPORT_FILENAME_PATTERN,
  reportFilename,
  reportTimestamp,
} from './reportFilename';

describe('report filename', () => {
  const fixed = new Date('2026-06-26T14:32:00.512Z');

  it('stamps a filesystem-safe UTC instant (no colons, no millis)', () => {
    expect(reportTimestamp(fixed)).toBe('2026-06-26T14-32-00Z');
  });

  it('builds the approved pdf + xlsx names from one instant', () => {
    expect(reportFilename('pdf', fixed)).toBe('ratio-report-2026-06-26T14-32-00Z.pdf');
    expect(reportFilename('xlsx', fixed)).toBe('ratio-report-2026-06-26T14-32-00Z.xlsx');
  });

  it('matches the shared filename pattern for both formats', () => {
    expect(reportFilename('pdf', fixed)).toMatch(REPORT_FILENAME_PATTERN);
    expect(reportFilename('xlsx', fixed)).toMatch(REPORT_FILENAME_PATTERN);
  });

  it('rejects malformed names with the shared pattern', () => {
    expect('ratio-report-2026-06-26.pdf').not.toMatch(REPORT_FILENAME_PATTERN);
    expect('report-2026-06-26T14-32-00Z.pdf').not.toMatch(REPORT_FILENAME_PATTERN);
    expect('ratio-report-2026-06-26T14-32-00Z.csv').not.toMatch(REPORT_FILENAME_PATTERN);
  });
});

