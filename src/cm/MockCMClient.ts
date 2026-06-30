// MockCMClient — offline/CI-safe mock. No network, no credentials.
// Synthesizes a deterministic ticket ref (CHG-MOCK-<hash>) + a fake URL + ISO
// timestamp. The same workloadId + action always produces the same ref so calls
// are idempotent under test. This is what CI uses with no env vars set.

import type {
  CMClient,
  CMFindingInput,
  CMTicketResult,
  CMReferenceRecord,
  CMStatusResult,
  CMAttachInput,
} from './CMClient';

const MOCK_BASE_URL = 'https://cm.example.mock';

/** djb2-style hash → 6-char uppercase base-36 string. Deterministic, collision-resistant. */
function mockHash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  return (h >>> 0).toString(36).toUpperCase().padStart(6, '0');
}

export class MockCMClient implements CMClient {
  readonly mode = 'mock' as const;
  /** Mirrors the provider field on live adapters — used by the API route's CMAdapter interface. */
  readonly provider = 'mock' as const;

  async createChange(finding: CMFindingInput, action: string): Promise<CMTicketResult> {
    // Simulate realistic latency so the loading state is visible during development.
    await new Promise<void>((resolve) => setTimeout(resolve, 220));
    const ref = `CHG-MOCK-${mockHash(finding.workloadId + action)}`;
    return {
      provider: 'mock',
      ticketRef: ref,
      url: `${MOCK_BASE_URL}/change/${ref}`,
      status: 'created',
      createdAt: new Date().toISOString(),
    };
  }

  async attachReference(input: CMAttachInput): Promise<CMReferenceRecord> {
    await new Promise<void>((resolve) => setTimeout(resolve, 160));
    const ref = input.ticketRef.trim();
    if (!ref) {
      throw new Error('ticketRef must not be empty');
    }
    return {
      provider: input.provider,
      ticketRef: ref.toUpperCase(),
      url: `${MOCK_BASE_URL}/change/${ref.toUpperCase()}`,
      createdAt: new Date().toISOString(),
    };
  }

  async getStatus(ticketRef: string): Promise<CMStatusResult> {
    await new Promise<void>((resolve) => setTimeout(resolve, 110));
    return {
      ticketRef,
      status: 'open',
      updatedAt: new Date().toISOString(),
    };
  }
}

