// CostSource slice public API — mirrors src/finio/index.ts and src/tokenomics/index.ts.
// Callers only ever see the CostSourceClient interface and createCostSourceClient;
// concrete implementations are an internal detail.
import { LiveCostSourceClient } from './LiveCostSourceClient';
import { MockCostSourceClient } from './MockCostSourceClient';
import type { CostSourceClient } from './CostSourceClient';

export type {
  CostSourceClient,
  CostSourceDescriptor,
  CostRowsResult,
  CostFinding,
  FindingType,
  FindingSeverity,
  FindingStatus,
  SourceHealth,
  SourceKind,
  SourceCoverage,
  SourceCapability,
  CostWindow,
} from './CostSourceClient';
export type {
  CanonicalFocusRow,
  CanonicalCostRow,
  RawSourceRow,
  RatioFocusExtensions,
} from './focusRows';
export type { FocusVersion } from './focusVersions';
export {
  CANONICAL_FOCUS_VERSION,
  FOCUS_VERSIONS,
  COLUMNS_BY_VERSION,
  columnsAddedAfter,
} from './focusVersions';
export type { ComposedRatioView } from './normalize';
export { composeRatioView } from './normalize';

/** Returns MockCostSourceClient by default; pass `'live'` to get the live client. */
export function createCostSourceClient(mode: 'mock' | 'live' = 'mock'): CostSourceClient {
  return mode === 'live' ? new LiveCostSourceClient() : new MockCostSourceClient();
}

