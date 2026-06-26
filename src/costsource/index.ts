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

// Source adapters — exported so callers can use them directly or the seam
// dispatches to them. Each adapter is source-specific (auth, fetch, identity);
// the engine and downstream views are unchanged regardless of which adapter
// produced the rows.
export { FocusFileAdapter } from './FocusFileAdapter';
export {
  PointFiveLiveAdapter,
  mapOpportunityToFinding,
  mapAnomalyToFinding,
} from './PointFiveLiveAdapter';
export type { PointFiveLiveAdapterDeps } from './PointFiveLiveAdapter';
export {
  POINTFIVE_LIVE_SOURCE_ID,
  POINTFIVE_LIVE_FLAG_ENV,
  DEFAULT_POINTFIVE_MCP_URL,
  isPointFiveLiveEnabled,
  resolvePointFiveStatus,
  pointFiveLiveDescriptor,
} from './pointfiveConfig';
export type { PointFiveStatus, PointFiveCredentials } from './pointfiveConfig';
export type {
  PointFiveMcpClient,
  PointFiveMcpClientFactory,
  PointFiveOpportunity,
  PointFiveAnomaly,
  PointFiveFocusRow,
} from './PointFiveMcpTransport';

/** Returns MockCostSourceClient by default; pass `'live'` to get the live client. */
export function createCostSourceClient(mode: 'mock' | 'live' = 'mock'): CostSourceClient {
  return mode === 'live' ? new LiveCostSourceClient() : new MockCostSourceClient();
}

