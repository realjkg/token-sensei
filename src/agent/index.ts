// Agent factory — selects the live Claude client only when a key is configured,
// otherwise the data-grounded mock. The app is fully functional with no key.
//
// TODO(wave3b): remove the client-side NEXT_PUBLIC_ANTHROPIC_API_KEY path after
// ChatPanel + the server-proxied AIClient seam (src/ai) replace this surface.
// The Wave3b seam keeps all LLM keys server-side; this Phase 1 client-side key
// is the gap it closes.

import { LiveAgentClient } from './LiveAgentClient';
import { MockAgentClient } from './MockAgentClient';
import type { AgentClient } from './AgentClient';

export type { AgentClient, AgentContext, AgentReply } from './AgentClient';

export function createAgentClient(): AgentClient {
  const key = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
  if (key && key.trim().length > 0) {
    return new LiveAgentClient(key);
  }
  return new MockAgentClient();
}

