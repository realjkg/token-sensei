// App store — Zustand. Holds the (mutable) workload/budget/alert state plus UI
// selection, and drives the interactive flows: governance gate sequencing,
// demand-shape changes, threshold edits, alert acknowledgement, and agent chat.

import { create } from 'zustand';
import type {
  Alert,
  BudgetProfile,
  DemandShape,
  GovernanceGateId,
  ModelEntry,
  Workload,
} from '@/types';
import { WORKLOADS, DEMO_NOW } from '@/data/workloads';
import { BUDGET_PROFILES } from '@/data/budgets';
import { ALERTS } from '@/data/alerts';
import { MODEL_REGISTRY } from '@/data/models';
import { allGatesPassed } from '@/lib/derive';
import { createAgentClient } from '@/agent';

export type SecondaryMode = 'value' | 'cost' | 'unit';
export type DetailTab = 'budget' | 'models' | 'governance' | 'demand' | 'unit' | 'alerts';
export type ChatRole = 'user' | 'agent' | 'system';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  timestamp: string;
  workloadsReferenced?: string[];
}

export interface Filters {
  team: string;
  provider: string;
  environment: string;
}

// Gate keys in their enforced order (spec §5.1).
const GATE_ORDER: Array<keyof Workload['governance']> = [
  'policy_check',
  'ethics_review',
  'cost_approval',
  'scale_authorized',
];

const GATE_KEY: Record<GovernanceGateId, keyof Workload['governance']> = {
  policy: 'policy_check',
  ethics: 'ethics_review',
  cost: 'cost_approval',
  scale: 'scale_authorized',
};

const agent = createAgentClient();

let messageSeq = 0;
function nextMessageId(): string {
  messageSeq += 1;
  return `msg-${messageSeq}`;
}

interface AppState {
  now: Date;
  workloads: Workload[];
  budgets: BudgetProfile[];
  alerts: Alert[];
  models: ModelEntry[];

  selectedId: string;
  activeTab: DetailTab;
  secondaryMode: SecondaryMode;
  filters: Filters;

  messages: ChatMessage[];
  agentThinking: boolean;
  agentMode: 'mock' | 'live';

  select: (id: string) => void;
  setTab: (tab: DetailTab) => void;
  setSecondaryMode: (mode: SecondaryMode) => void;
  setFilter: (key: keyof Filters, value: string) => void;
  resetFilters: () => void;

  toggleGate: (workloadId: string, gate: GovernanceGateId) => void;
  setDemandShape: (workloadId: string, shape: DemandShape) => void;
  updateThresholds: (
    workloadId: string,
    thresholds: { soft: number; hard: number; kill: number },
  ) => void;
  acknowledgeAlert: (alertId: string) => void;

  sendMessage: (query: string) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  now: DEMO_NOW,
  workloads: WORKLOADS,
  budgets: BUDGET_PROFILES,
  alerts: ALERTS,
  models: MODEL_REGISTRY,

  selectedId: WORKLOADS[0]?.id ?? '',
  activeTab: 'budget',
  secondaryMode: 'value',
  filters: { team: 'all', provider: 'all', environment: 'all' },

  messages: [
    {
      id: nextMessageId(),
      role: 'system',
      text: 'Ratio agent online. I govern value ratios, not just cost. Ask me anything about your AI spend.',
      timestamp: DEMO_NOW.toISOString(),
    },
  ],
  agentThinking: false,
  agentMode: agent.mode,

  select: (id) => set({ selectedId: id }),
  setTab: (tab) => set({ activeTab: tab }),
  setSecondaryMode: (mode) => set({ secondaryMode: mode }),
  setFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),
  resetFilters: () => set({ filters: { team: 'all', provider: 'all', environment: 'all' } }),

  toggleGate: (workloadId, gate) =>
    set((state) => ({
      workloads: state.workloads.map((w) => {
        if (w.id !== workloadId) return w;
        const key = GATE_KEY[gate];
        const idx = GATE_ORDER.indexOf(key);
        const turningOn = !w.governance[key];
        // Sequential enforcement: a gate can only turn on if all prior gates are
        // on; turning a gate off cascades to every gate after it.
        if (turningOn) {
          const priorAllPassed = GATE_ORDER.slice(0, idx).every((k) => w.governance[k]);
          if (!priorAllPassed) return w;
        }
        const nextGov = { ...w.governance };
        if (turningOn) {
          nextGov[key] = true;
        } else {
          for (let i = idx; i < GATE_ORDER.length; i += 1) {
            nextGov[GATE_ORDER[i]] = false;
          }
        }
        return { ...w, governance: nextGov };
      }),
    })),

  setDemandShape: (workloadId, shape) =>
    set((state) => ({
      workloads: state.workloads.map((w) => {
        if (w.id !== workloadId) return w;
        // Spec §5.3: Always-On requires all gates; block the change otherwise.
        if (shape === 'always_on' && !allGatesPassed(w)) return w;
        return { ...w, demand_shape: shape };
      }),
    })),

  updateThresholds: (workloadId, thresholds) =>
    set((state) => ({
      budgets: state.budgets.map((b) =>
        b.workload_id === workloadId
          ? {
              ...b,
              soft_threshold_pct: thresholds.soft,
              hard_threshold_pct: thresholds.hard,
              kill_threshold_pct: thresholds.kill,
            }
          : b,
      ),
    })),

  acknowledgeAlert: (alertId) =>
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === alertId ? { ...a, acknowledged: true, acknowledged_by: 'k.user' } : a,
      ),
    })),

  sendMessage: async (query) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const { workloads, budgets, alerts, models, selectedId, now } = get();

    const userMessage: ChatMessage = {
      id: nextMessageId(),
      role: 'user',
      text: trimmed,
      timestamp: new Date().toISOString(),
    };
    set((state) => ({ messages: [...state.messages, userMessage], agentThinking: true }));

    try {
      const reply = await agent.ask(trimmed, {
        workloads,
        budgets,
        alerts,
        models,
        focusWorkloadId: selectedId,
        now,
      });
      const agentMessage: ChatMessage = {
        id: nextMessageId(),
        role: 'agent',
        text: reply.text,
        timestamp: new Date().toISOString(),
        workloadsReferenced: reply.workloadsReferenced,
      };
      set((state) => ({ messages: [...state.messages, agentMessage], agentThinking: false }));
    } catch (error) {
      // Never swallow the failure — surface it in the chat so the user knows.
      const message = error instanceof Error ? error.message : 'Unknown error';
      const errorMessage: ChatMessage = {
        id: nextMessageId(),
        role: 'system',
        text: `Agent error: ${message}`,
        timestamp: new Date().toISOString(),
      };
      set((state) => ({ messages: [...state.messages, errorMessage], agentThinking: false }));
    }
  },
}));

