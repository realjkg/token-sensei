// Smoke tests for the three tokenomics integrity metrics.
// Tests cover: formula math, divide-by-zero guards, pipeline fractional-heartbeat
// assumption, and ledger sync delta (pass at 0, fail at non-zero).
import { describe, it, expect } from 'vitest';
import {
  counterAlignment,
  pipelineIntegrity,
  ledgerSyncDelta,
} from './calculations';

// ---------------------------------------------------------------------------
// Metric 1 — Counter Alignment
// ---------------------------------------------------------------------------

describe('counterAlignment', () => {
  it('computes the correct percentage for normal inputs', () => {
    const result = counterAlignment({
      totalIngestedEvents: 99_850,
      totalHardwareReportedEvents: 100_000,
    });
    expect(result.percentage).toBeCloseTo(99.85, 4);
    expect(result.pass).toBe(true);
  });

  it('passes at exactly 100%', () => {
    const result = counterAlignment({
      totalIngestedEvents: 100,
      totalHardwareReportedEvents: 100,
    });
    expect(result.percentage).toBe(100);
    expect(result.pass).toBe(true);
  });

  it('fails below 99%', () => {
    const result = counterAlignment({
      totalIngestedEvents: 980,
      totalHardwareReportedEvents: 1_000,
    });
    expect(result.percentage).toBeCloseTo(98, 2);
    expect(result.pass).toBe(false);
  });

  it('guards divide-by-zero when hardwareReported === 0', () => {
    const result = counterAlignment({
      totalIngestedEvents: 500,
      totalHardwareReportedEvents: 0,
    });
    expect(result.percentage).toBe(0);
    expect(result.pass).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Metric 2 — Pipeline Integrity (fractional-heartbeat assumption)
// ---------------------------------------------------------------------------

describe('pipelineIntegrity', () => {
  it('computes correct score with fractional heartbeat allowance', () => {
    // score = (980_000 / 1_000_000) - 0.005 = 0.98 - 0.005 = 0.975
    const result = pipelineIntegrity({
      uniqueProcessedTokens: 980_000,
      rawIngestedTokens: 1_000_000,
      expectedDroppedHeartbeats: 0.005,
      threshold: 0.95,
    });
    expect(result.score).toBeCloseTo(0.975, 6);
    expect(result.pass).toBe(true);
  });

  it('fails when score is below the configurable threshold', () => {
    // score = (900_000 / 1_000_000) - 0.05 = 0.9 - 0.05 = 0.85
    const result = pipelineIntegrity({
      uniqueProcessedTokens: 900_000,
      rawIngestedTokens: 1_000_000,
      expectedDroppedHeartbeats: 0.05,
      threshold: 0.95,
    });
    expect(result.score).toBeCloseTo(0.85, 6);
    expect(result.pass).toBe(false);
  });

  it('respects a custom threshold', () => {
    // score = 0.85, threshold = 0.80 → pass
    const result = pipelineIntegrity({
      uniqueProcessedTokens: 900_000,
      rawIngestedTokens: 1_000_000,
      expectedDroppedHeartbeats: 0.05,
      threshold: 0.80,
    });
    expect(result.pass).toBe(true);
  });

  it('guards divide-by-zero when rawIngested === 0', () => {
    const result = pipelineIntegrity({
      uniqueProcessedTokens: 500,
      rawIngestedTokens: 0,
      expectedDroppedHeartbeats: 0.01,
      threshold: 0.95,
    });
    expect(result.score).toBe(0);
    expect(result.pass).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Metric 3 — Ledger Sync Delta
// ---------------------------------------------------------------------------

describe('ledgerSyncDelta', () => {
  it('returns delta === 0 and inSync === true when balances match', () => {
    const result = ledgerSyncDelta({
      uiDisplayedBalance: 842_350,
      immutableDatabaseBalance: 842_350,
    });
    expect(result.delta).toBe(0);
    expect(result.inSync).toBe(true);
  });

  it('returns non-zero delta and inSync === false when balances differ', () => {
    const result = ledgerSyncDelta({
      uiDisplayedBalance: 842_400,
      immutableDatabaseBalance: 842_350,
    });
    expect(result.delta).toBe(50);
    expect(result.inSync).toBe(false);
  });

  it('handles negative delta (UI showing less than DB)', () => {
    const result = ledgerSyncDelta({
      uiDisplayedBalance: 842_300,
      immutableDatabaseBalance: 842_350,
    });
    expect(result.delta).toBe(-50);
    expect(result.inSync).toBe(false);
  });

  it('passes for zero balances (both are 0)', () => {
    const result = ledgerSyncDelta({
      uiDisplayedBalance: 0,
      immutableDatabaseBalance: 0,
    });
    expect(result.delta).toBe(0);
    expect(result.inSync).toBe(true);
  });
});

