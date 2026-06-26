// Confidence-gate routing for adjustment cards (Ratio v2 PR H, WS3 capstone).
//
// This is where a proposed change's prediction meets governance. The math and
// the >=99% gate already live in the prediction seam (PR G); this module is the
// pure decision layer the adjustment card renders from:
//
//   - clears the 99% gate  -> "Confident — ready to apply" (NEVER auto-applied)
//   - below the gate        -> routed to a governance gate for human confirmation
//
// Spec WS3, "the confidence gate — where >=99% meets governance": a low-confidence
// cost prediction blocks at the Cost gate (Gate 3); a scale change with low-
// confidence impact blocks at the Scale gate (Gate 4). The accuracy feature does
// not invent a new approval path — it routes uncertainty into the existing gates
// (obvious.md Governance Gates, R3). No side effects, no React, fully unit-testable.

import type { ChangePrediction, CostImpact } from '@/prediction';

// ---------------------------------------------------------------------------
// Gate routing
// ---------------------------------------------------------------------------

/** The two governance gates a low-confidence change can be queued at. */
export type GovernanceGate = 'cost' | 'scale';

export interface ReadyRoute {
  kind: 'ready';
}

export interface GovernanceRoute {
  kind: 'governance';
  gate: GovernanceGate;
  gateLabel: string; // e.g. 'Cost Gate · Gate 3'
  reason: string;
}

/** Where a predicted change is routed once the confidence gate is evaluated. */
export type AdjustmentRoute = ReadyRoute | GovernanceRoute;

const GATE_LABEL: Record<GovernanceGate, string> = {
  cost: 'Cost Gate · Gate 3',
  scale: 'Scale Gate · Gate 4',
};

/**
 * Route a predicted change. Clearing the >=99% gate means the impact is shown as
 * a firm number and the user may apply it in one tap (the apply itself is never
 * automatic). Below the gate the change is queued for human confirmation: a
 * scale change blocks at the Scale gate (Gate 4); every other change type blocks
 * at the Cost gate (Gate 3).
 */
export function routeAdjustment(prediction: ChangePrediction): AdjustmentRoute {
  if (prediction.clearsConfidenceGate) {
    return { kind: 'ready' };
  }
  const gate: GovernanceGate = prediction.changeType === 'scale' ? 'scale' : 'cost';
  return {
    kind: 'governance',
    gate,
    gateLabel: GATE_LABEL[gate],
    reason: `Prediction below the 99% confidence bar — queued at the ${GATE_LABEL[gate]} for human confirmation.`,
  };
}

// ---------------------------------------------------------------------------
// R4 guard — cost is never shown without its paired value-ratio
// ---------------------------------------------------------------------------

export interface PairedImpact {
  deltaDailySpend: number;
  deltaMonthlySpend: number;
  deltaValueRatio: number;
}

/**
 * R4 (value is the denominator): a cost figure may NEVER be presented without
 * its paired value-ratio effect. This view builder is the structural guard the
 * adjustment card renders from — it refuses to emit cost deltas unless a finite
 * value-ratio delta rides with them, turning the rule into a fail-closed invariant
 * rather than a convention.
 */
export function pairedImpact(impact: CostImpact): PairedImpact {
  if (typeof impact.deltaValueRatio !== 'number' || !Number.isFinite(impact.deltaValueRatio)) {
    throw new Error(
      'R4 violation: a cost impact cannot be shown without a paired, finite value-ratio delta',
    );
  }
  return {
    deltaDailySpend: impact.deltaDailySpend,
    deltaMonthlySpend: impact.deltaMonthlySpend,
    deltaValueRatio: impact.deltaValueRatio,
  };
}

// ---------------------------------------------------------------------------
// Display state — honest cold-start labeling
// ---------------------------------------------------------------------------

/**
 * How an adjustment card should present a prediction:
 *  - confident               — cleared the 99% gate, shown as a firm number
 *  - estimated_cold_start    — no realized history yet; band is fully uncertain
 *  - estimated_low_confidence— has history but the error band is too wide
 */
export type AdjustmentDisplayState =
  | 'confident'
  | 'estimated_cold_start'
  | 'estimated_low_confidence';

/**
 * Derive the display state. Cold-start is distinguished from a merely wide band
 * by the confidence margin: with no error history the relative margin is
 * Infinity (the seam's by-construction cold-start signal), which the card surfaces
 * honestly as "Estimated — ledger building" rather than dressing it as low data.
 */
export function adjustmentDisplayState(prediction: ChangePrediction): AdjustmentDisplayState {
  if (prediction.clearsConfidenceGate) return 'confident';
  if (!Number.isFinite(prediction.confidence.relativeMargin)) return 'estimated_cold_start';
  return 'estimated_low_confidence';
}

export const DISPLAY_STATE_LABEL: Record<AdjustmentDisplayState, string> = {
  confident: 'Confident — ready to apply',
  estimated_cold_start: 'Estimated — ledger building',
  estimated_low_confidence: 'Estimated — needs confirmation',
};

