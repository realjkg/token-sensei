// Tests for the prediction-error ledger (PR G). Covers the approved accuracy
// math, the no-op exclusion, p50/p90/p10 computation, the rolling source error
// distribution + source selection, the confidence band, and the cold-start
// path. Fixtures are synthetic and live only here — the live demo stays in
// cold-start mode per the approved scope guard.
import { describe, it, expect } from 'vitest';
import type { ChangeType, LedgerEntry, PredictionSourceId } from './PredictionClient';
import { ACCURACY_TARGET, perChangeAccuracy, percentile, accuracyStats } from './accuracy';
import {
  MIN_REALIZED_CHANGES,
  scoreChange,
  validationWindowFor,
  rollingErrorDistribution,
} from './ledger';
import {
  selectSource,
  confidenceBand,
  clearsConfidenceGate,
} from './sourceSelection';
import { buildPrediction } from './predictors';
import { buildAccuracyReport } from './report';
import { createPredictionClient } from './index';
import { WORKLOADS } from '@/data/workloads';
import { MODEL_REGISTRY } from '@/data/models';

// --- fixture helper ---------------------------------------------------------

let counter = 0;
function entry(opts: {
  source?: PredictionSourceId;
  changeType?: ChangeType;
  predicted: number;
  actual: number;
}): LedgerEntry {
  const i = counter++;
  const day = String((i % 27) + 1).padStart(2, '0');
  return scoreChange({
    id: `e-${i}`,
    workloadId: 'wl-support',
    changeType: opts.changeType ?? 'model_switch',
    source: opts.source ?? 'provider_pricing',
    predictedDeltaCost: opts.predicted,
    actualDeltaCost: opts.actual,
    clearedConfidenceGate: true,
    predictedAt: `2026-05-${day}T00:00:00Z`,
    realizedAt: `2026-06-${day}T00:00:00Z`,
  });
}

/** N scored entries for a source/change type at a fixed relative error. */
function entriesAtError(
  source: PredictionSourceId,
  changeType: ChangeType,
  relError: number,
  n: number,
): LedgerEntry[] {
  // actual = 100, predicted = 100 * (1 + relError) gives |p-a|/|a| = relError.
  return Array.from({ length: n }, () =>
    entry({ source, changeType, predicted: 100 * (1 + relError), actual: 100 }),
  );
}

// ---------------------------------------------------------------------------
// Accuracy formula + no-op exclusion
// ---------------------------------------------------------------------------

describe('perChangeAccuracy', () => {
  it('is 1.0 for an exact prediction', () => {
    expect(perChangeAccuracy(100, 100).accuracy).toBe(1);
  });

  it('is 0.99 when the prediction lands within 1% of realized', () => {
    const r = perChangeAccuracy(99, 100);
    expect(r.accuracy).toBeCloseTo(0.99, 10);
    expect(r.isNoOp).toBe(false);
  });

  it('can go negative when the prediction is wildly off', () => {
    // |250 - 100| / 100 = 1.5 -> accuracy -0.5
    expect(perChangeAccuracy(250, 100).accuracy).toBeCloseTo(-0.5, 10);
  });

  it('excludes a no-op (actual === 0) from the ratio and tracks correctness', () => {
    const correct = perChangeAccuracy(0, 0);
    expect(correct.accuracy).toBeNull();
    expect(correct.isNoOp).toBe(true);
    expect(correct.noOpPredictedCorrectly).toBe(true);

    const wrong = perChangeAccuracy(5, 0);
    expect(wrong.accuracy).toBeNull();
    expect(wrong.isNoOp).toBe(true);
    expect(wrong.noOpPredictedCorrectly).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Percentiles
// ---------------------------------------------------------------------------

describe('percentile', () => {
  const sample = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  it('computes p50/p90/p10 by linear interpolation', () => {
    expect(percentile(sample, 0.5)).toBe(5);
    expect(percentile(sample, 0.9)).toBe(9);
    expect(percentile(sample, 0.1)).toBe(1);
  });

  it('returns the single value for a one-element sample', () => {
    expect(percentile([42], 0.5)).toBe(42);
  });

  it('returns null for an empty sample', () => {
    expect(percentile([], 0.5)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// accuracyStats: p50/p90 + no-op handling
// ---------------------------------------------------------------------------

describe('accuracyStats', () => {
  it('reports p50/p90, excludes no-ops, and counts no-op correctness', () => {
    const entries: LedgerEntry[] = [
      entry({ predicted: 100, actual: 100 }), // 1.0
      entry({ predicted: 99, actual: 100 }), // 0.99
      entry({ predicted: 99.5, actual: 100 }), // 0.995
      entry({ predicted: 98, actual: 100 }), // 0.98
      entry({ predicted: 97, actual: 100 }), // 0.97
      entry({ predicted: 0, actual: 0 }), // no-op, correct
      entry({ predicted: 9, actual: 0 }), // no-op, wrong
    ];
    const stats = accuracyStats(entries);
    expect(stats.scoredCount).toBe(5); // no-ops excluded
    expect(stats.medianAccuracy).toBeCloseTo(0.99, 10);
    expect(stats.meetsTarget).toBe(true); // 0.99 >= ACCURACY_TARGET
    expect(stats.p90Accuracy as number).toBeGreaterThan(0.99);
    expect(stats.p10Accuracy as number).toBeLessThan(0.99);
    expect(stats.noOpCount).toBe(2);
    expect(stats.noOpCorrect).toBe(1);
  });

  it('is empty-safe: null median, meetsTarget false', () => {
    const stats = accuracyStats([]);
    expect(stats.scoredCount).toBe(0);
    expect(stats.medianAccuracy).toBeNull();
    expect(stats.meetsTarget).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Validation windows
// ---------------------------------------------------------------------------

describe('validation windows', () => {
  it('defaults model switches to 14 days and others to 7', () => {
    expect(validationWindowFor('model_switch')).toBe(14);
    expect(validationWindowFor('demand_shape')).toBe(7);
    expect(validationWindowFor('scale')).toBe(7);
    expect(validationWindowFor('budget')).toBe(7);
  });

  it('scoreChange stamps the change-type window unless overridden', () => {
    expect(
      scoreChange({
        id: 'x',
        workloadId: 'wl-support',
        changeType: 'model_switch',
        source: 'provider_pricing',
        predictedDeltaCost: 10,
        actualDeltaCost: 10,
        clearedConfidenceGate: true,
        predictedAt: '2026-06-01T00:00:00Z',
        realizedAt: '2026-06-15T00:00:00Z',
      }).validationWindowDays,
    ).toBe(14);
  });
});

// ---------------------------------------------------------------------------
// Rolling error distribution
// ---------------------------------------------------------------------------

describe('rollingErrorDistribution', () => {
  it('computes mean/std error and flags enough history at the threshold', () => {
    const entries = entriesAtError('provider_pricing', 'model_switch', 0.02, MIN_REALIZED_CHANGES);
    const dist = rollingErrorDistribution(entries, 'provider_pricing', 'model_switch');
    expect(dist.sampleSize).toBe(MIN_REALIZED_CHANGES);
    expect(dist.meanAbsRelError).toBeCloseTo(0.02, 10);
    expect(dist.stdAbsRelError).toBeCloseTo(0, 10);
    expect(dist.hasEnoughHistory).toBe(true);
  });

  it('reports Infinity mean and no history when there are no entries', () => {
    const dist = rollingErrorDistribution([], 'pointfive', 'scale');
    expect(dist.sampleSize).toBe(0);
    expect(dist.meanAbsRelError).toBe(Infinity);
    expect(dist.hasEnoughHistory).toBe(false);
  });

  it('honors the rolling window and excludes no-ops', () => {
    const entries = [
      ...entriesAtError('forecast_engine', 'scale', 0.05, 4),
      entry({ source: 'forecast_engine', changeType: 'scale', predicted: 0, actual: 0 }), // no-op
    ];
    const dist = rollingErrorDistribution(entries, 'forecast_engine', 'scale', 2);
    expect(dist.sampleSize).toBe(2); // windowed to last 2 scored, no-op dropped
  });
});

// ---------------------------------------------------------------------------
// Source selection
// ---------------------------------------------------------------------------

describe('selectSource', () => {
  it('selects the lowest-historical-error qualified source for a change type', () => {
    const entries = [
      ...entriesAtError('provider_pricing', 'model_switch', 0.001, 6), // best
      ...entriesAtError('forecast_engine', 'model_switch', 0.08, 6), // worse
    ];
    const sel = selectSource(entries, 'model_switch');
    expect(sel.coldStart).toBe(false);
    expect(sel.source).toBe('provider_pricing');
  });

  it('ignores sources without enough history', () => {
    const entries = [
      ...entriesAtError('forecast_engine', 'scale', 0.05, MIN_REALIZED_CHANGES),
      ...entriesAtError('provider_pricing', 'scale', 0.0001, 2), // too few, ignored
    ];
    const sel = selectSource(entries, 'scale');
    expect(sel.coldStart).toBe(false);
    expect(sel.source).toBe('forecast_engine');
  });

  it('cold-starts to the change-type default when no source qualifies', () => {
    const sel = selectSource([], 'demand_shape');
    expect(sel.coldStart).toBe(true);
    expect(sel.source).toBe('forecast_engine'); // DEFAULT_SOURCE_BY_CHANGE_TYPE
  });
});

// ---------------------------------------------------------------------------
// Confidence band + gate
// ---------------------------------------------------------------------------

describe('confidence band + gate', () => {
  it('derives a finite band from a source with history', () => {
    const entries = entriesAtError('provider_pricing', 'model_switch', 0.005, 6);
    const dist = rollingErrorDistribution(entries, 'provider_pricing', 'model_switch');
    const band = confidenceBand(1000, dist);
    expect(Number.isFinite(band.low)).toBe(true);
    expect(Number.isFinite(band.high)).toBe(true);
    expect(band.z).toBe(1.28);
    expect(band.expectedRelativeError).toBeCloseTo(0.005, 10);
  });

  it('reads as fully uncertain (Infinity) at cold-start', () => {
    const dist = rollingErrorDistribution([], 'pointfive', 'budget');
    const band = confidenceBand(1000, dist);
    expect(band.relativeMargin).toBe(Infinity);
    expect(band.high).toBe(Infinity);
    expect(band.low).toBe(-Infinity);
  });

  it('clears the gate only with enough history within (1 - target)', () => {
    const tight = rollingErrorDistribution(
      entriesAtError('provider_pricing', 'model_switch', 0.005, 6),
      'provider_pricing',
      'model_switch',
    );
    expect(0.005).toBeLessThanOrEqual(1 - ACCURACY_TARGET);
    expect(clearsConfidenceGate(tight)).toBe(true);

    const loose = rollingErrorDistribution(
      entriesAtError('forecast_engine', 'model_switch', 0.05, 6),
      'forecast_engine',
      'model_switch',
    );
    expect(clearsConfidenceGate(loose)).toBe(false); // error above 1%

    const thin = rollingErrorDistribution(
      entriesAtError('pointfive', 'model_switch', 0.001, 2),
      'pointfive',
      'model_switch',
    );
    expect(clearsConfidenceGate(thin)).toBe(false); // not enough history
  });
});

// ---------------------------------------------------------------------------
// buildPrediction + report (cold-start integration)
// ---------------------------------------------------------------------------

describe('buildPrediction (cold-start)', () => {
  const workload = WORKLOADS[0];

  it('predicts a finite model-switch impact but stays estimated at cold-start', () => {
    const prediction = buildPrediction(
      [],
      {
        type: 'model_switch',
        workloadId: workload.id,
        fromModel: workload.model,
        toModel: 'gemini-2.5-flash',
      },
      { workload, registry: MODEL_REGISTRY },
    );
    expect(Number.isFinite(prediction.impact.deltaMonthlySpend)).toBe(true);
    expect(prediction.estimated).toBe(true);
    expect(prediction.mode).toBe('estimated');
    expect(prediction.clearsConfidenceGate).toBe(false);
    expect(prediction.source).toBe('provider_pricing'); // cold-start default
    expect(prediction.confidence.relativeMargin).toBe(Infinity);
  });

  it('treats a budget change as a predicted no-op (zero delta)', () => {
    const prediction = buildPrediction(
      [],
      { type: 'budget', workloadId: workload.id, newMonthlyBudget: 99_999 },
      { workload, registry: MODEL_REGISTRY },
    );
    expect(prediction.impact.deltaMonthlySpend).toBe(0);
    expect(prediction.impact.deltaValueRatio).toBe(0);
  });
});

describe('buildAccuracyReport', () => {
  it('is cold-start with an empty ledger', () => {
    const report = buildAccuracyReport([]);
    expect(report.coldStart).toBe(true);
    expect(report.totalEntries).toBe(0);
    expect(report.overall.scoredCount).toBe(0);
    expect(report.overall.medianAccuracy).toBeNull();
  });

  it('leaves cold-start once a source has enough realized history', () => {
    const entries = entriesAtError('provider_pricing', 'model_switch', 0.004, 6);
    const report = buildAccuracyReport(entries);
    expect(report.coldStart).toBe(false);
    expect(report.byChangeType.model_switch.scoredCount).toBe(6);
    expect(report.byChangeType.model_switch.meetsTarget).toBe(true);
  });
});

describe('MockPredictionClient', () => {
  it('runs offline in cold-start / estimated mode', async () => {
    const client = createPredictionClient('mock');
    const prediction = await client.predictChange({
      type: 'scale',
      workloadId: 'wl-support',
      volumeMultiplier: 1.5,
    });
    expect(prediction.estimated).toBe(true);
    const report = await client.getAccuracyReport();
    expect(report.coldStart).toBe(true);
    expect(report.totalEntries).toBe(0);
  });

  it('throws on an unknown workload', async () => {
    const client = createPredictionClient('mock');
    await expect(
      client.predictChange({ type: 'scale', workloadId: 'nope', volumeMultiplier: 2 }),
    ).rejects.toThrow('Unknown workload');
  });
});

