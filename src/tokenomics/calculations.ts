// Pure calculation functions for the three tokenomics integrity metrics.
// Each function takes fully named, typed inputs and returns the computed value
// plus a pass/fail status. No side effects, no imports, fully unit-testable.

import type {
  CounterAlignmentInputs,
  PipelineIntegrityInputs,
  LedgerSyncInputs,
} from './TokenomicsClient';

// ---------------------------------------------------------------------------
// Metric 1 — Hardware Ingest: Counter Alignment
// ---------------------------------------------------------------------------

/**
 * Counter Alignment — what share of hardware-reported events were ingested?
 *
 * Formula: (totalIngestedEvents / totalHardwareReportedEvents) * 100
 * Healthy when the result approaches 100%.
 *
 * Guard: returns percentage=0, pass=false when hardwareReported===0 to avoid
 * divide-by-zero; callers should surface this as a data-pipeline error.
 */
export function counterAlignment(
  inputs: CounterAlignmentInputs,
): { percentage: number; pass: boolean } {
  const { totalIngestedEvents, totalHardwareReportedEvents } = inputs;

  if (totalHardwareReportedEvents === 0) {
    return { percentage: 0, pass: false };
  }

  const percentage = (totalIngestedEvents / totalHardwareReportedEvents) * 100;
  // "Approaches 100%" — pass at >= 99% to give a 1-point tolerance.
  const pass = percentage >= 99;
  return { percentage, pass };
}

// ---------------------------------------------------------------------------
// Metric 2 — Data Pipeline: Deduplication & Loss
// ---------------------------------------------------------------------------

/**
 * Pipeline Integrity — deduplication and loss score.
 *
 * Formula: (uniqueProcessedTokens / rawIngestedTokens) - expectedDroppedHeartbeats
 *
 * ASSUMPTION: `expectedDroppedHeartbeats` is a FRACTIONAL ALLOWANCE (0-1,
 * a share of rawIngestedTokens), NOT a raw event count. Subtracting it from
 * the deduplication ratio yields a clean 0-1 integrity score.
 *
 * If Kristian intended a raw count, the formula should instead be:
 *   (uniqueProcessedTokens / rawIngestedTokens) - (expectedDroppedHeartbeats / rawIngestedTokens)
 * Please confirm the unit so this can be corrected.
 *
 * Guard: returns score=0, pass=false when rawIngested===0.
 */
export function pipelineIntegrity(
  inputs: PipelineIntegrityInputs,
): { score: number; pass: boolean } {
  const {
    uniqueProcessedTokens,
    rawIngestedTokens,
    expectedDroppedHeartbeats,
    threshold,
  } = inputs;

  if (rawIngestedTokens === 0) {
    return { score: 0, pass: false };
  }

  const score =
    uniqueProcessedTokens / rawIngestedTokens - expectedDroppedHeartbeats;
  const pass = score >= threshold;
  return { score, pass };
}

// ---------------------------------------------------------------------------
// Metric 3 — UI Presentation: Ledger Sync Delta
// ---------------------------------------------------------------------------

/**
 * Ledger Sync Delta — reconciliation check between UI and the immutable DB.
 *
 * Formula: uiDisplayedBalance - immutableDatabaseBalance
 * Healthy when delta === exactly 0 (perfect reconciliation).
 * Any non-zero delta means the UI is showing stale or incorrect figures.
 */
export function ledgerSyncDelta(
  inputs: LedgerSyncInputs,
): { delta: number; inSync: boolean } {
  const { uiDisplayedBalance, immutableDatabaseBalance } = inputs;
  const delta = uiDisplayedBalance - immutableDatabaseBalance;
  return { delta, inSync: delta === 0 };
}

