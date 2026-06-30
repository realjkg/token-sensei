// ConnectorCard — renders a single cost-source adapter.
// Shows source identity, FOCUS version → canonical mapping, connection state,
// and a disabled affordance (no backing runtime action in mock mode).
// Controlled-egress paths (live PointFive OAuth 2.1 → MCP SSE broker) carry
// the reserved warm accent (#ffc44d / shape token).

import type { CostSourceDescriptor } from '@/costsource/CostSourceClient';

// Only the live PointFive adapter is a controlled-egress path: it routes through
// PointFive's broker under OAuth 2.1. The sandbox mock is offline seed data.
const CONTROLLED_EGRESS_IDS = new Set(['pointfive-live']);

const KIND_LABEL: Record<string, string> = {
  pointfive: 'PointFive',
  focus_file: 'FOCUS file',
  cloud: 'Cloud FOCUS',
  kubernetes: 'Kubernetes',
  nutanix: 'Nutanix',
  mock: 'Mock',
};

const COVERAGE_LABEL: Record<string, string> = {
  public_cloud: 'Public cloud',
  private_cloud: 'Private cloud',
  on_prem: 'On-prem',
};

const CAPABILITY_LABEL: Record<string, string> = {
  costRows: 'Cost rows',
  findings: 'Findings',
};

/** Three honest states: data flowing, configurable-but-off, ships-dark controlled-egress. */
type ConnState = 'connected' | 'available' | 'dark';

function connState(src: CostSourceDescriptor): ConnState {
  if (src.configured) return 'connected';
  if (CONTROLLED_EGRESS_IDS.has(src.id)) return 'dark';
  return 'available';
}

const STATE_COLOR: Record<ConnState, string> = {
  connected: 'var(--value)',
  available: 'var(--dim)',
  dark: 'var(--shape)',
};

const STATE_LABEL: Record<ConnState, string> = {
  connected: 'Connected',
  available: 'Available',
  dark: 'Dark',
};

export function ConnectorCard({ source }: { source: CostSourceDescriptor }) {
  const state = connState(source);
  const isEgress = CONTROLLED_EGRESS_IDS.has(source.id);
  const caps = source.capabilities
    .map((c) => CAPABILITY_LABEL[c] ?? c)
    .join(' · ');

  const borderStyle: React.CSSProperties =
    state === 'connected'
      ? { borderColor: 'rgba(0,224,158,0.2)' }
      : isEgress
      ? { borderColor: 'rgba(255,196,77,0.2)' }
      : {};

  return (
    <div
      className="flex flex-col gap-2.5 rounded-card border border-edge bg-slab p-4 motion-safe:transition-colors"
      style={borderStyle}
    >
      {/* Top row: kind badge + optional controlled-egress chip + status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded bg-raised px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-sub">
            {KIND_LABEL[source.kind] ?? source.kind}
          </span>
          {isEgress && (
            <span
              className="rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider"
              style={{
                color: 'var(--shape)',
                borderColor: 'rgba(255,196,77,0.3)',
                background: 'rgba(255,196,77,0.07)',
              }}
            >
              controlled-egress
            </span>
          )}
        </div>

        {/* Status indicator */}
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: STATE_COLOR[state] }}
          />
          <span
            className="font-mono text-[10px] uppercase tracking-wider"
            style={{ color: STATE_COLOR[state] }}
          >
            {STATE_LABEL[state]}
          </span>
        </div>
      </div>

      {/* Source name */}
      <h3 className="font-mono text-sm font-bold text-txt leading-snug">{source.name}</h3>

      {/* FOCUS version → canonical mapping */}
      <div className="flex items-center gap-1 font-mono text-[11px]">
        <span className="text-sub">FOCUS</span>
        <span style={{ color: 'var(--gate)' }}>v{source.focusVersion}</span>
        <span className="text-dim">→</span>
        <span className="text-dim">canonical v1.4</span>
      </div>

      {/* Coverage · capabilities */}
      <div className="flex flex-wrap items-center gap-1 text-[11px] text-sub">
        <span>{COVERAGE_LABEL[source.coverage] ?? source.coverage}</span>
        <span className="text-dim">·</span>
        <span>{caps}</span>
      </div>

      {/* Descriptor note */}
      <p className="text-[11px] leading-relaxed text-dim">{source.note}</p>

      {/* Action affordance — disabled: no backing runtime action in mock mode */}
      <div className="mt-auto flex justify-end pt-1">
        <button
          type="button"
          disabled
          title={
            state === 'connected'
              ? 'Disconnect not wired in mock mode'
              : 'Set feature flag + credentials to enable'
          }
          className="cursor-not-allowed rounded border border-edge px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-dim"
        >
          {state === 'connected' ? 'Disconnect' : 'Enable'}
        </button>
      </div>
    </div>
  );
}

