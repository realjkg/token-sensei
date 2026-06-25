// In-memory mock — no network. Derives real FOCUS rows from the same seed
// workloads the rest of the app uses, so the demo shows truthful numbers,
// not placeholders. Mirrors MockHelloClient's pattern.
import { WORKLOADS } from '@/data/workloads';
import type { FinioClient, FinioExport, HandshakeRequest, HandshakeResult } from './FinioClient';
import { workloadsToFocusRows } from './mapWorkloadToFocus';

export class MockFinioClient implements FinioClient {
  readonly mode = 'mock' as const;

  async handshake(req: HandshakeRequest): Promise<HandshakeResult> {
    // Simulate a short network round-trip so the loading state is visible.
    await new Promise((resolve) => setTimeout(resolve, 150));
    return {
      sessionId: `mock-${req.nonce}`,
      accepts: ['finio.export'],
      focusVersion: '1.1',
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
    };
  }

  async export(_sessionId: string): Promise<FinioExport> {
    // Small delay so the UI shows a realistic two-phase loading state.
    await new Promise((resolve) => setTimeout(resolve, 200));
    return {
      focusVersion: '1.1',
      generatedAt: new Date().toISOString(),
      rows: workloadsToFocusRows(WORKLOADS),
    };
  }
}

