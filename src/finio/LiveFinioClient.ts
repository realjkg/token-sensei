// Live client — calls the Next.js /api/a2a/handshake and /api/finio/export
// routes. Mirrors LiveHelloClient error handling: throws a typed Error on both
// network failure and non-2xx so callers always see a message, never a raw
// fetch rejection or silent undefined.
import type { FinioClient, FinioExport, HandshakeRequest, HandshakeResult } from './FinioClient';
import { FINIO_DEMO_TOKEN } from './FinioClient';

export class LiveFinioClient implements FinioClient {
  readonly mode = 'live' as const;

  async handshake(req: HandshakeRequest): Promise<HandshakeResult> {
    let res: Response;
    try {
      res = await fetch('/api/a2a/handshake', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${FINIO_DEMO_TOKEN}`,
        },
        body: JSON.stringify(req),
      });
    } catch (err) {
      throw new Error(
        `FinIO handshake unreachable: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
    if (!res.ok) {
      throw new Error(`FinIO handshake error ${res.status}: ${await res.text()}`);
    }
    return (await res.json()) as HandshakeResult;
  }

  async export(sessionId: string): Promise<FinioExport> {
    let res: Response;
    try {
      res = await fetch(
        `/api/finio/export?sessionId=${encodeURIComponent(sessionId)}`,
        { headers: { authorization: `Bearer ${sessionId}` } },
      );
    } catch (err) {
      throw new Error(
        `FinIO export unreachable: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
    if (!res.ok) {
      throw new Error(`FinIO export error ${res.status}: ${await res.text()}`);
    }
    return (await res.json()) as FinioExport;
  }
}

