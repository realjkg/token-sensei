// Prediction-error ledger seam (PR G) — the bookkeeping + selection layer that
// earns Ratio's >=99% change-impact accuracy claim (spec art_MtDqOyd9, WS3).
//
// Mirrors the repo's proven typed-client-seam pattern (HelloClient PR #8,
// FinioClient PR #9, TokenomicsClient PR #10, CostSourceClient PR D): a typed
// interface, a mock that runs fully offline, a live impl behind a Next.js API
// route, and a demo page. This PR builds the machinery ONLY; per the approved
// scope it does NOT seed a synthetic back-test — the demo runs honestly in
// cold-start / estimated mode until a real ledger of realized changes fills.
//
// The adjustment-card UI and the confidence-gate wiring into the Cost/Scale
// governance gates are a follow-up (PR H); this PR stops at the prediction,
// the source selection, the confidence band, and the scored ledger.

import type { DemandShape } from '@/types';

// ---------------------------------------------------------------------------
// Change taxonomy
// ---------------------------------------------------------------------------

/** The four kinds of change whose cost impact Ratio predicts and scores. */
export type ChangeType = 'model_switch' | 'demand_shape' | 'scale' | 'budget';

/**
 * Candidate prediction sources, scored independently per change type — "the
 * most accurate model in the multi-model context" (spec WS3):
 *  - pointfive        — an estimate via the CostSource seam (PR D / live PR E)
 *  - forecast_engine  — Ratio's internal forecast (spec §6)
 *  - provider_pricing — list pricing over the multi-model registry (spec §8)
 */
export type PredictionSourceId = 'pointfive' | 'forecast_engine' | 'provider_pricing';

interface BaseChange {
  workloadId: string;
}

export interface ModelSwitchChange extends BaseChange {
  type: 'model_switch';
  fromModel: string; // model_name in the registry
  toModel: string;
}

export interface DemandShapeChange extends BaseChange {
  type: 'demand_shape';
  fromShape: DemandShape;
  toShape: DemandShape;
}

export interface ScaleChange extends BaseChange {
  type: 'scale';
  volumeMultiplier: number; // >1 scale up, <1 scale down
}

export interface BudgetChange extends BaseChange {
  type: 'budget';
  newMonthlyBudget: number;
}

/** A proposed change — a discriminated union keyed on `type`. */
export type ProposedChange =
  | ModelSwitchChange
  | DemandShapeChange
  | ScaleChange
  | BudgetChange;

// ---------------------------------------------------------------------------
// Predicted (and realized) impact
// ---------------------------------------------------------------------------

/**
 * Cost-and-value impact of a change. R4: cost is ALWAYS carried with its
 * value-ratio effect, never in isolation — the adjustment card (PR H) renders
 * both together.
 */
export interface CostImpact {
  deltaDailySpend: number;
  deltaMonthlySpend: number;
  deltaValueRatio: number;
}

/**
 * 80% confidence band on the predicted monthly Δcost, derived from the selected
 * source's historical prediction-error distribution (spec §6.3 math, z = 1.28,
 * applied to prediction error rather than to forecast spread). At cold-start
 * (no history) the margins read as Infinity — fully uncertain, by construction.
 */
export interface ConfidenceBand {
  low: number;
  high: number;
  z: number;
  relativeMargin: number; // z * stdAbsRelError
  expectedRelativeError: number; // mean |predicted-actual|/|actual| historically
}

/**
 * A prediction for a proposed change: which source was selected, the predicted
 * impact, the confidence band, and whether it cleared the >=99% confidence gate
 * or must be shown as an estimate (and, in PR H, routed to human confirmation).
 */
export interface ChangePrediction {
  workloadId: string;
  changeType: ChangeType;
  source: PredictionSourceId;
  impact: CostImpact;
  confidence: ConfidenceBand;
  clearsConfidenceGate: boolean;
  estimated: boolean; // true at cold-start or below the gate
  mode: 'confident' | 'estimated';
  rationale: string;
}

// ---------------------------------------------------------------------------
// Ledger
// ---------------------------------------------------------------------------

/**
 * One scored prediction: predicted vs. realized Δcost measured over a
 * validation window, with the approved per-change accuracy and the no-op
 * booleans. The ledger is the auditable back-test of the >=99% claim.
 */
export interface LedgerEntry {
  id: string;
  workloadId: string;
  changeType: ChangeType;
  source: PredictionSourceId;
  predictedDeltaCost: number; // monthly Δ predicted at decision time
  actualDeltaCost: number; // monthly Δ realized over the validation window
  validationWindowDays: number;
  perChangeAccuracy: number | null; // null when no-op (excluded from the ratio)
  isNoOp: boolean; // actualDeltaCost === 0
  noOpPredictedCorrectly: boolean | null; // only set when isNoOp
  clearedConfidenceGate: boolean;
  predictedAt: string; // ISO 8601
  realizedAt: string; // ISO 8601
}

// ---------------------------------------------------------------------------
// Accuracy reporting
// ---------------------------------------------------------------------------

/**
 * Rolled-up accuracy over a set of scored changes. p50 is the headline bar;
 * p90 sits alongside it, and p10 surfaces the hard-to-predict tail rather than
 * letting the median hide it (spec WS3).
 */
export interface AccuracyStats {
  scoredCount: number; // non-no-op changes counted in the ratio
  medianAccuracy: number | null; // p50; null when scoredCount === 0
  p90Accuracy: number | null; // upper decile
  p10Accuracy: number | null; // hard-to-predict tail
  meetsTarget: boolean; // medianAccuracy >= ACCURACY_TARGET
  noOpCount: number;
  noOpCorrect: number;
}

/**
 * Per-source / per-change-type rolling error distribution. Drives both source
 * selection (lowest mean error wins) and the confidence band.
 */
export interface SourceErrorDistribution {
  source: PredictionSourceId;
  changeType: ChangeType;
  sampleSize: number;
  meanAbsRelError: number; // Infinity when there is no history yet
  stdAbsRelError: number;
  hasEnoughHistory: boolean; // sampleSize >= MIN_REALIZED_CHANGES
}

/** The full ledger summary returned by getAccuracyReport() / the API route. */
export interface AccuracyReport {
  generatedAt: string; // ISO 8601
  coldStart: boolean; // no source has enough realized changes anywhere
  totalEntries: number;
  overall: AccuracyStats;
  byChangeType: Record<ChangeType, AccuracyStats>;
  distributions: SourceErrorDistribution[];
}

// ---------------------------------------------------------------------------
// Client interface
// ---------------------------------------------------------------------------

export interface PredictionClient {
  readonly mode: 'mock' | 'live';
  /**
   * Predict a proposed change's cost impact, selecting the lowest-historical-
   * error source for its change type and attaching a confidence band.
   */
  predictChange(change: ProposedChange): Promise<ChangePrediction>;
  /** The accuracy ledger summary — p50/p90 per change type + cold-start state. */
  getAccuracyReport(): Promise<AccuracyReport>;
}

