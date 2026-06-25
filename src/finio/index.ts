// FinIO slice public API — mirrors src/hello/index.ts.
// Callers only ever see the FinioClient interface and createFinioClient;
// concrete implementations are an internal detail.
import { LiveFinioClient } from './LiveFinioClient';
import { MockFinioClient } from './MockFinioClient';
import type { FinioClient } from './FinioClient';

export type {
  FinioClient,
  FinioExport,
  FocusRow,
  FocusVersion,
  HandshakeRequest,
  HandshakeResult,
} from './FinioClient';

/** Returns MockFinioClient by default; pass `'live'` to get LiveFinioClient. */
export function createFinioClient(mode: 'mock' | 'live' = 'mock'): FinioClient {
  return mode === 'live' ? new LiveFinioClient() : new MockFinioClient();
}

