// Source selection + confidence band. For a new change, Ratio selects the
// lowest-historical-error source for that change type (spec WS3, "the most
// accurate model in the multi-model context"), then derives an 80% confidence
// band from that source's error distribution. Cold-start — no source with
// enough history — falls back to a sensible default and stays in estimated mode.

import type {
  ChangeType,
  ConfidenceBand,
  LedgerEntry,
  PredictionSourceId,
  SourceErrorDistribution,
} from './PredictionClient';
import { ACCURACY_TARGET } from './accuracy';
import { rollingErrorDistribution } from './ledger';

/** The candidate sources scored for every change. */
export const CANDIDATE_SOURCES: PredictionSourceId[] = [
  'pointfive',
  'forecast_engine',
  'provider_pricing',
];

/**
 * Cold-start default source per change type, used until some source has earned
 * enough history. List pricing is exact for a model switch (§8); the forecast
 * engine is the safest default for volume/budget-shaped changes (§6).
 */
export const DEFAULT_SOURCE_BY_CHANGE_TYPE: Record<ChangeType, PredictionSourceId> = {
  model_switch: 'provider_pricing',
  demand_shape: 'forecast_engine',
  scale: 'forecast_engine',
  budget: 'forecast_engine',
};

/** The 80% z-score (spec §6.3). */
export const CONFIDENCE_Z = 1.28;

export interface SourceSelection {
  source: PredictionSourceId;
  changeType: ChangeType;
  distribution: SourceErrorDistribution;
  coldStart: boolean; // true when no candidate had enough history
  candidates: SourceErrorDistribution[];
}

/**
 * Select the lowest-historical-error source for a change type. Among candidates
 * with enough history, pick the smallest meanAbsRelError; if none qualify, fall
 * back to the change-type default and flag cold-start.
 */
export function selectSource(
  entries: LedgerEntry[],
  changeType: ChangeType,
  candidates: PredictionSourceId[] = CANDIDATE_SOURCES,
): SourceSelection {
  const distributions = candidates.map((s) =>
    rollingErrorDistribution(entries, s, changeType),
  );
  const qualified = distributions.filter((d) => d.hasEnoughHistory);

  if (qualified.length === 0) {
    const fallback = DEFAULT_SOURCE_BY_CHANGE_TYPE[changeType];
    const distribution =
      distributions.find((d) => d.source === fallback) ?? distributions[0];
    return {
      source: distribution.source,
      changeType,
      distribution,
      coldStart: true,
      candidates: distributions,
    };
  }

  const best = qualified.reduce((min, d) =>
    d.meanAbsRelError < min.meanAbsRelError ? d : min,
  );
  return {
    source: best.source,
    changeType,
    distribution: best,
    coldStart: false,
    candidates: distributions,
  };
}

/**
 * 80% confidence band on the predicted monthly Δcost, from the source's error
 * distribution (spec §6.3 math applied to prediction error). With no history the
 * relative margin is Infinity — the band reads as fully uncertain.
 */
export function confidenceBand(
  predictedDeltaCost: number,
  distribution: SourceErrorDistribution,
): ConfidenceBand {
  const hasHistory = distribution.sampleSize > 0;
  const relativeMargin = hasHistory
    ? CONFIDENCE_Z * distribution.stdAbsRelError
    : Infinity;
  const margin = hasHistory
    ? Math.abs(predictedDeltaCost) * relativeMargin
    : Infinity;
  return {
    low: hasHistory ? predictedDeltaCost - margin : -Infinity,
    high: hasHistory ? predictedDeltaCost + margin : Infinity,
    z: CONFIDENCE_Z,
    relativeMargin,
    expectedRelativeError: distribution.meanAbsRelError,
  };
}

/**
 * The >=99% confidence gate: a source clears it only with enough history AND a
 * historical mean error within (1 - target). Below the gate the prediction is
 * shown as an estimate and routed to human confirmation — PR H wires that into
 * the Cost (Gate 3) / Scale (Gate 4) governance gates.
 */
export function clearsConfidenceGate(
  distribution: SourceErrorDistribution,
): boolean {
  return (
    distribution.hasEnoughHistory &&
    distribution.meanAbsRelError <= 1 - ACCURACY_TARGET
  );
}

