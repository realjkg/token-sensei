// Hello slice public API — mirrors src/agent/index.ts.
// Consumers import the factory; concrete classes are not part of the public
// contract so they can be swapped without touching call sites.

import { LiveHelloClient } from './LiveHelloClient';
import { MockHelloClient } from './MockHelloClient';
import type { HelloClient } from './HelloClient';

export type { HelloClient, HelloMessage } from './HelloClient';

/** Returns MockHelloClient by default; pass `'live'` to get LiveHelloClient. */
export function createHelloClient(mode: 'mock' | 'live' = 'mock'): HelloClient {
  return mode === 'live' ? new LiveHelloClient() : new MockHelloClient();
}

