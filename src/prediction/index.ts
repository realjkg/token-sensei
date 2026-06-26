// Prediction slice public API — mirrors src/costsource/index.ts and
// src/tokenomics/index.ts. Callers see the PredictionClient interface and
// createPredictionClient; the concrete impls and the pure helpers are exported
// for the demo page, the API routes, and the test suite.
import { LivePredictionClient } from './LivePredictionClient';
import { MockPredictionClient } from './MockPredictionClient';
import type { PredictionClient } from './PredictionClient';

export type {
  PredictionClient,
  ChangeType,
  PredictionSourceId,
  ProposedChange,
  ModelSwitchChange,
  DemandShapeChange,
  ScaleChange,
  BudgetChange,
  CostImpact,
  ConfidenceBand,
  ChangePrediction,
  LedgerEntry,
  AccuracyStats,
  SourceErrorDistribution,
  AccuracyReport,
} from './PredictionClient';

export {
  ACCURACY_TARGET,
  perChangeAccuracy,
  percentile,
  accuracyStats,
  type PerChangeAccuracy,
} from './accuracy';
export {
  MIN_REALIZED_CHANGES,
  ROLLING_WINDOW,
  VALIDATION_WINDOW_DAYS,
  validationWindowFor,
  scoreChange,
  filterEntries,
  rollingErrorDistribution,
  type ScoreChangeInput,
} from './ledger';
export {
  CANDIDATE_SOURCES,
  DEFAULT_SOURCE_BY_CHANGE_TYPE,
  CONFIDENCE_Z,
  selectSource,
  confidenceBand,
  clearsConfidenceGate,
  type SourceSelection,
} from './sourceSelection';
export {
  predictImpact,
  buildPrediction,
  type PredictionContext,
} from './predictors';
export { buildAccuracyReport } from './report';

/** Returns MockPredictionClient by default; pass `'live'` for the live client. */
export function createPredictionClient(
  mode: 'mock' | 'live' = 'mock',
): PredictionClient {
  return mode === 'live' ? new LivePredictionClient() : new MockPredictionClient();
}

