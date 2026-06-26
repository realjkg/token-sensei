// Tests for the confidence-gate routing layer (PR H, WS3 capstone). Covers the
// gate-routing decision (>=99% -> confident/ready; below -> governance), the R4
// no-value-ratio guard, and the honest cold-start display state. Pure helpers
// only — no DOM — matching the prediction-seam test style (PR G).
import { describe, it, expect } from 'vitest';
import type { ChangePrediction, ChangeType, CostImpact } from '@/prediction';
import {
  routeAdjustment,
  pairedImpact,
  adjustmentDisplayState,
  DISPLAY_STATE_LABEL,
} from './adjustmentGate';

// --- fixture helper ---------------------------------------------------------

function prediction(opts: {
  changeType?: ChangeType;
  clearsConfidenceGate: boolean;
  relativeMargin: number; // Infinity at cold-start
  deltaValueRatio?: number;
}): ChangePrediction {
  const clears = opts.clearsConfidenceGate;
  return {
    workloadId: 'wl-support',
    changeType: opts.changeType ?? 'model_switch',
    source: 'provider_pricing',
    impact: {
      deltaDailySpend: -10,
      deltaMonthlySpend: -300,
      deltaValueRatio: opts.deltaValueRatio ?? 0.5,
    },
    confidence: {
      low: clears ? -310 : -Infinity,
      high: clears ? -290 : Infinity,
      z: 1.28,
      relativeMargin: opts.relativeMargin,
      expectedRelativeError: Number.isFinite(opts.relativeMargin) ? 0.004 : Infinity,
    },
    clearsConfidenceGate: clears,
    estimated: !clears,
    mode: clears ? 'confident' : 'estimated',
    rationale: 'fixture',
  };
}

// --- gate routing -----------------------------------------------------------

describe('routeAdjustment', () => {
  it('routes a >=99% prediction to the ready (confident) path', () => {
    const route = routeAdjustment(
      prediction({ clearsConfidenceGate: true, relativeMargin: 0.005 }),
    );
    expect(route.kind).toBe('ready');
  });

  it('routes a below-gate non-scale change to the Cost gate (Gate 3)', () => {
    const route = routeAdjustment(
      prediction({
        changeType: 'model_switch',
        clearsConfidenceGate: false,
        relativeMargin: Infinity,
      }),
    );
    expect(route.kind).toBe('governance');
    if (route.kind !== 'governance') throw new Error('expected governance route');
    expect(route.gate).toBe('cost');
    expect(route.gateLabel).toContain('Gate 3');
  });

  it('routes a below-gate scale change to the Scale gate (Gate 4)', () => {
    const route = routeAdjustment(
      prediction({
        changeType: 'scale',
        clearsConfidenceGate: false,
        relativeMargin: Infinity,
      }),
    );
    expect(route.kind).toBe('governance');
    if (route.kind !== 'governance') throw new Error('expected governance route');
    expect(route.gate).toBe('scale');
    expect(route.gateLabel).toContain('Gate 4');
  });

  it('routes demand_shape and budget changes to the Cost gate when below the bar', () => {
    for (const changeType of ['demand_shape', 'budget'] as ChangeType[]) {
      const route = routeAdjustment(
        prediction({ changeType, clearsConfidenceGate: false, relativeMargin: 0.2 }),
      );
      expect(route.kind).toBe('governance');
      if (route.kind !== 'governance') throw new Error('expected governance route');
      expect(route.gate).toBe('cost');
    }
  });
});

// --- R4 guard ---------------------------------------------------------------

describe('pairedImpact (R4 guard)', () => {
  it('passes a cost impact that carries a finite value-ratio delta', () => {
    const impact: CostImpact = {
      deltaDailySpend: -10,
      deltaMonthlySpend: -300,
      deltaValueRatio: 0.6,
    };
    expect(pairedImpact(impact)).toEqual(impact);
  });

  it('throws when the value-ratio delta is missing (R4 violation)', () => {
    const costOnly = {
      deltaDailySpend: -10,
      deltaMonthlySpend: -300,
    } as unknown as CostImpact;
    expect(() => pairedImpact(costOnly)).toThrow(/R4 violation/);
  });

  it('throws when the value-ratio delta is NaN or Infinite', () => {
    expect(() =>
      pairedImpact({ deltaDailySpend: 0, deltaMonthlySpend: 0, deltaValueRatio: NaN }),
    ).toThrow(/R4 violation/);
    expect(() =>
      pairedImpact({ deltaDailySpend: 0, deltaMonthlySpend: 0, deltaValueRatio: Infinity }),
    ).toThrow(/R4 violation/);
  });
});

// --- display state ----------------------------------------------------------

describe('adjustmentDisplayState', () => {
  it('is confident when the prediction clears the 99% gate', () => {
    const state = adjustmentDisplayState(
      prediction({ clearsConfidenceGate: true, relativeMargin: 0.004 }),
    );
    expect(state).toBe('confident');
    expect(DISPLAY_STATE_LABEL[state]).toContain('ready to apply');
  });

  it('is cold-start when there is no error history (infinite margin)', () => {
    const state = adjustmentDisplayState(
      prediction({ clearsConfidenceGate: false, relativeMargin: Infinity }),
    );
    expect(state).toBe('estimated_cold_start');
    expect(DISPLAY_STATE_LABEL[state]).toContain('ledger building');
  });

  it('is low-confidence when history exists but the band is too wide', () => {
    const state = adjustmentDisplayState(
      prediction({ clearsConfidenceGate: false, relativeMargin: 0.35 }),
    );
    expect(state).toBe('estimated_low_confidence');
    expect(DISPLAY_STATE_LABEL[state]).toContain('needs confirmation');
  });
});

