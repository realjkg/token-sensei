// Agent seam — spec §3.5, §7. The UI talks to an AgentClient interface so a
// real Claude implementation can drop in behind the same contract. The mock
// responder is the default and needs no API key; a live client is selected only
// when VITE_ANTHROPIC_API_KEY is present.

import type { Alert, BudgetProfile, ModelEntry, Workload } from '@/types';

export interface AgentContext {
  workloads: Workload[];
  budgets: BudgetProfile[];
  alerts: Alert[];
  models: ModelEntry[];
  focusWorkloadId: string | null;
  now: Date;
}

export interface AgentReply {
  text: string;
  workloadsReferenced: string[];
}

export interface AgentClient {
  readonly mode: 'mock' | 'live';
  ask(query: string, ctx: AgentContext): Promise<AgentReply>;
}

