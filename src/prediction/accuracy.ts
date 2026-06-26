// Pure accuracy math for the prediction-error ledger (spec art_MtDqOyd9, WS3).
//
// Approved definition:
//   per_change_accuracy = 1 - |predicted_Δcost - actual_Δcost| / |actual_Δcost|
// reported as median (p50) >= 99% across changes, with p90 alongside. A no-op
// (actual_Δcost === 0) is EXCLUDED from the ratio to avoid divide-by-zero, and
// tracked instead as a separate "no-op predicted correctly?" boolean.
//
// No side effects, no app imports — fully unit-testable.

import type { LedgerEntry, AccuracyStats } from './PredictionClient';

/** The >=99% accuracy bar, as a fraction. */
export const ACCURACY_TARGET = 0.99;

export interface PerChangeAccuracy {
  accuracy: number | null; // null when no-op
  isNoOp: boolean;
  noOpPredictedCorrectly: boolean | null; // only meaningful when isNoOp
}

/**
 * The approved per-change accuracy formula. A no-op (actual === 0) returns
 * accuracy=null — excluded from the ratio — and records whether the no-op was
 * itself predicted correctly, so a zero-effect change never distorts the
 * distribution with a divide-by-zero.
 */
export function perChangeAccuracy(
  predictedDeltaCost: number,
  actualDeltaCost: number,
): PerChangeAccuracy {
  if (actualDeltaCost === 0) {
    return {
      accuracy: null,
      isNoOp: true,
      noOpPredictedCorrectly: predictedDeltaCost === 0,
    };
  }
  const accuracy =
    1 - Math.abs(predictedDeltaCost - actualDeltaCost) / Math.abs(actualDeltaCost);
  return { accuracy, isNoOp: false, noOpPredictedCorrectly: null };
}

/**
 * Linear-interpolated percentile of a numeric sample. `p` is in [0, 1].
 * Returns null for an empty sample.
 */
export function percentile(sample: number[], p: number): number | null {
  if (sample.length === 0) return null;
  const sorted = [...sample].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/**
 * Roll a set of scored entries up into p50/p90/p10 accuracy plus no-op counts.
 * No-op entries are excluded from the accuracy percentiles by construction
 * (their perChangeAccuracy is null).
 */
export function accuracyStats(entries: LedgerEntry[]): AccuracyStats {
  const scored = entries.filter(
    (e) => !e.isNoOp && e.perChangeAccuracy !== null,
  );
  const accuracies = scored.map((e) => e.perChangeAccuracy as number);
  const noOps = entries.filter((e) => e.isNoOp);
  const medianAccuracy = percentile(accuracies, 0.5);

  return {
    scoredCount: scored.length,
    medianAccuracy,
    p90Accuracy: percentile(accuracies, 0.9),
    p10Accuracy: percentile(accuracies, 0.1),
    meetsTarget: medianAccuracy !== null && medianAccuracy >= ACCURACY_TARGET,
    noOpCount: noOps.length,
    noOpCorrect: noOps.filter((e) => e.noOpPredictedCorrectly === true).length,
  };
}

