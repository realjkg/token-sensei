// In-memory mock — no network. Returns a TokenomicsReport built from realistic
// seed inputs, mirroring MockFinioClient's pattern.
//
// Seed values are chosen to produce:
//   Metric 1 — counter alignment ~99.85% (pass)
//   Metric 2 — pipeline integrity ~0.975 (pass, threshold 0.95)
//   Metric 3 — ledger delta exactly 0 (in-sync, pass)
import type { TokenomicsClient, TokenomicsReport } from './TokenomicsClient';
import { counterAlignment, pipelineIntegrity, ledgerSyncDelta } from './calculations';

// ---------------------------------------------------------------------------
// Seed inputs
// ---------------------------------------------------------------------------

const COUNTER_ALIGNMENT_SEED = {
  totalIngestedEvents: 99_850,
  totalHardwareReportedEvents: 100_000,
};

const PIPELINE_INTEGRITY_SEED = {
  uniqueProcessedTokens: 980_000,
  rawIngestedTokens: 1_000_000,
  // Fractional allowance: 0.5% of raw as expected heartbeat drop.
  // See ASSUMPTION note in calculations.ts and TokenomicsClient.ts.
  expectedDroppedHeartbeats: 0.005,
  threshold: 0.95,
};

// Ledger balances match exactly — delta should be 0, inSync true.
const LEDGER_SYNC_SEED = {
  uiDisplayedBalance: 842_350,
  immutableDatabaseBalance: 842_350,
};

// ---------------------------------------------------------------------------
// Mock client
// ---------------------------------------------------------------------------

export class MockTokenomicsClient implements TokenomicsClient {
  readonly mode = 'mock' as const;

  async getTokenomicsReport(): Promise<TokenomicsReport> {
    // Small delay so the UI can show a realistic loading state.
    await new Promise((resolve) => setTimeout(resolve, 200));

    const caResult = counterAlignment(COUNTER_ALIGNMENT_SEED);
    const piResult = pipelineIntegrity(PIPELINE_INTEGRITY_SEED);
    const lsResult = ledgerSyncDelta(LEDGER_SYNC_SEED);

    const allPass = caResult.pass && piResult.pass && lsResult.inSync;

    return {
      generatedAt: new Date().toISOString(),
      overallHealthy: allPass,
      metrics: {
        counterAlignment: {
          layer: 'Hardware Ingest',
          focus: 'Counter Alignment',
          formulaLabel: '(Ingested Events ÷ Hardware-Reported Events) × 100',
          value: caResult.percentage,
          pass: caResult.pass,
          inputs: COUNTER_ALIGNMENT_SEED,
        },
        pipelineIntegrity: {
          layer: 'Data Pipeline',
          focus: 'Deduplication & Loss',
          formulaLabel: '(Unique Processed Tokens ÷ Raw Ingested Tokens) − Expected Dropped Heartbeats',
          value: piResult.score,
          pass: piResult.pass,
          inputs: PIPELINE_INTEGRITY_SEED,
        },
        ledgerSync: {
          layer: 'UI Presentation',
          focus: 'Ledger Sync',
          formulaLabel: 'UI Displayed Balance − Immutable Database Balance',
          value: lsResult,
          pass: lsResult.inSync,
          inputs: LEDGER_SYNC_SEED,
        },
      },
    };
  }
}

