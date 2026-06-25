// Tokenomics slice public API — mirrors src/finio/index.ts.
// Callers only ever see the TokenomicsClient interface and createTokenomicsClient;
// concrete implementations are internal details.
import { LiveTokenomicsClient } from './LiveTokenomicsClient';
import { MockTokenomicsClient } from './MockTokenomicsClient';
import type { TokenomicsClient } from './TokenomicsClient';

export type {
  TokenomicsClient,
  TokenomicsMetric,
  TokenomicsMetricInputs,
  TokenomicsReport,
  CounterAlignmentInputs,
  PipelineIntegrityInputs,
  LedgerSyncInputs,
} from './TokenomicsClient';

/** Returns MockTokenomicsClient by default; pass `'live'` to get LiveTokenomicsClient. */
export function createTokenomicsClient(
  mode: 'mock' | 'live' = 'mock',
): TokenomicsClient {
  return mode === 'live' ? new LiveTokenomicsClient() : new MockTokenomicsClient();
}

