// Hello seam — mirrors the AgentClient pattern (src/agent/). The UI talks
// to a HelloClient interface so a live /api/hello backend can drop in behind
// the same contract. MockHelloClient is the default (no network); LiveHelloClient
// fetches from the Vite dev-server middleware.

export interface HelloMessage {
  message: string;
  timestamp: string; // ISO 8601
  source: 'mock' | 'live';
}

export interface HelloClient {
  readonly mode: 'mock' | 'live';
  getGreeting(): Promise<HelloMessage>;
}

