// CM slice public API — mirrors src/ai/index.ts.
// Callers see CMClient, createCMClient(), and the wire types; concrete
// implementations are an internal detail.

import { LiveCMClient } from './LiveCMClient';
import { MockCMClient } from './MockCMClient';
import type { CMClient } from './CMClient';

export type {
  CMClient,
  CMProvider,
  FindingStatus,
  CMFindingInput,
  CMTicketResult,
  CMReferenceRecord,
  CMStatusResult,
  CMAttachInput,
} from './CMClient';

export { MockCMClient } from './MockCMClient';

/**
 * Returns MockCMClient by default (offline-safe, no creds). Pass `'live'` to get
 * LiveCMClient, which proxies /api/v1/cm/change — creds never reach the browser.
 *
 * Provider selection (mock | jira | servicenow) is resolved server-side from
 * the CM_PROVIDER env var, not here.
 */
export function createCMClient(mode: 'mock' | 'live' = 'mock'): CMClient {
  return mode === 'live' ? new LiveCMClient() : new MockCMClient();
}

