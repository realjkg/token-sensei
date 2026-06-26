// In-memory mock — no network. Resolves the change's workload from the offline
// seed and runs the full predict → select → confidence pipeline.
//
// SCOPE: per the approved plan this mock does NOT seed a synthetic back-test.
// The ledger starts EMPTY, so every prediction is cold-start / estimated and
// the accuracy report honestly reports zero realized changes. Proving the
// >=99% machinery on a filled ledger is a separately user-gated action handled
// only by the test fixtures (prediction.test.ts), never by the live demo.
import type {
  AccuracyReport,
  ChangePrediction,
  LedgerEntry,
  PredictionClient,
  ProposedChange,
} from './PredictionClient';
import { WORKLOADS } from '@/data/workloads';
import { MODEL_REGISTRY } from '@/data/models';
import { buildPrediction } from './predictors';
import { buildAccuracyReport } from './report';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockPredictionClient implements PredictionClient {
  readonly mode = 'mock' as const;

  // Empty by design — cold-start. Future realized changes would append here.
  private readonly ledger: LedgerEntry[] = [];

  async predictChange(change: ProposedChange): Promise<ChangePrediction> {
    await delay(150);
    const workload = WORKLOADS.find((w) => w.id === change.workloadId);
    if (!workload) {
      throw new Error(`Unknown workload: ${change.workloadId}`);
    }
    return buildPrediction(this.ledger, change, {
      workload,
      registry: MODEL_REGISTRY,
    });
  }

  async getAccuracyReport(): Promise<AccuracyReport> {
    await delay(150);
    return buildAccuracyReport(this.ledger);
  }
}

