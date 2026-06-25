// Tokenomics seam — mirrors src/finio/FinioClient.ts. Defines the three
// layered integrity metrics, their inputs/outputs, the TokenomicsClient
// interface, and the TokenomicsReport wire type returned by /api/tokenomics.
//
// Each metric is a pure calculation over named, typed inputs so the UI can
// always show the full working (inputs → formula → result).

// ---------------------------------------------------------------------------
// Metric input types
// ---------------------------------------------------------------------------

/** Metric 1 inputs — Hardware Ingest: Counter Alignment. */
export interface CounterAlignmentInputs {
  totalIngestedEvents: number;
  totalHardwareReportedEvents: number;
}

/**
 * Metric 2 inputs — Data Pipeline: Deduplication & Loss.
 *
 * ⚠️  ASSUMPTION: `expectedDroppedHeartbeats` is treated as a FRACTIONAL
 * ALLOWANCE (a share of rawIngestedTokens, range 0–1), not a raw event count.
 * This keeps the result a clean 0–1 integrity score.
 * Kristian should confirm this unit; if a raw count was intended, the formula
 * should be: (unique / raw) − (dropped / raw) instead.
 */
export interface PipelineIntegrityInputs {
  uniqueProcessedTokens: number;
  rawIngestedTokens: number;
  /** Fractional allowance (0–1 share of rawIngested). See assumption note above. */
  expectedDroppedHeartbeats: number;
  /** Configurable pass threshold (0–1). Healthy when score >= threshold. */
  threshold: number;
}

/** Metric 3 inputs — UI Presentation: Ledger Sync. */
export interface LedgerSyncInputs {
  uiDisplayedBalance: number;
  immutableDatabaseBalance: number;
}

/** Union of all metric input shapes. */
export type TokenomicsMetricInputs =
  | CounterAlignmentInputs
  | PipelineIntegrityInputs
  | LedgerSyncInputs;

// ---------------------------------------------------------------------------
// Metric output / report types
// ---------------------------------------------------------------------------

/**
 * A single tokenomics metric — generic over its input shape and computed value.
 * Carries enough context for the UI to show: label, layer, focus, formula,
 * named inputs, computed value, and pass/fail status.
 */
export interface TokenomicsMetric<TInputs, TValue> {
  layer: string;        // e.g. 'Hardware Ingest'
  focus: string;        // e.g. 'Counter Alignment'
  formulaLabel: string; // human-readable formula string
  value: TValue;        // computed output (number or structured)
  pass: boolean;        // healthy / passing
  inputs: TInputs;      // raw named inputs so the UI can show the working
}

/** The full three-metric tokenomics report returned by getTokenomicsReport(). */
export interface TokenomicsReport {
  generatedAt: string; // ISO 8601
  metrics: {
    counterAlignment: TokenomicsMetric<CounterAlignmentInputs, number>;
    pipelineIntegrity: TokenomicsMetric<PipelineIntegrityInputs, number>;
    ledgerSync: TokenomicsMetric<LedgerSyncInputs, { delta: number; inSync: boolean }>;
  };
  /** True only when all three individual metrics pass. */
  overallHealthy: boolean;
}

// ---------------------------------------------------------------------------
// Client interface
// ---------------------------------------------------------------------------

export interface TokenomicsClient {
  readonly mode: 'mock' | 'live';
  getTokenomicsReport(): Promise<TokenomicsReport>;
}

