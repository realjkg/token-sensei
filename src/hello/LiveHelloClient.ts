// Live client — fetches from the /api/hello Vite dev-server middleware. Mirrors
// LiveAgentClient error handling: throws a typed Error so callers see a message,
// never a raw fetch rejection or silent undefined.

import type { HelloClient, HelloMessage } from './HelloClient';

const HELLO_URL = '/api/hello';

export class LiveHelloClient implements HelloClient {
  readonly mode = 'live' as const;

  async getGreeting(): Promise<HelloMessage> {
    let res: Response;
    try {
      res = await fetch(HELLO_URL);
    } catch (err) {
      throw new Error(
        `Hello API unreachable: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
    if (!res.ok) {
      throw new Error(`Hello API error ${res.status}: ${await res.text()}`);
    }
    return (await res.json()) as HelloMessage;
  }
}

