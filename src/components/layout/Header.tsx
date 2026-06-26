// Header bar — spec §3.2. Portfolio health at a glance: logo, product name,
// portfolio value ratio, total monthly spend, total monthly value, alert count.

import { useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { derivePortfolioRatio } from '@/lib/derive';
import { formatRatio, formatUSD } from '@/lib/format';
import { ratioColor } from '@/lib/scales';

export function Header() {
  const workloads = useStore((s) => s.workloads);
  const alerts = useStore((s) => s.alerts);
  const setTab = useStore((s) => s.setTab);
  const agentMode = useStore((s) => s.agentMode);

  const portfolio = useMemo(() => derivePortfolioRatio(workloads), [workloads]);
  const openAlerts = alerts.filter((a) => !a.acknowledged).length;

  return (
    <header className="flex items-center gap-6 border-b border-edge bg-deep px-5 h-14 shrink-0">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-md font-mono text-lg font-bold"
          style={{ background: 'var(--gate)' }}
        >
          <span className="text-white">%</span>
        </span>
        <span className="font-mono text-lg font-bold tracking-tight text-txt">Ratio</span>
        <span className="hidden text-[10px] uppercase tracking-widest text-dim sm:inline">
          AI FinOps
        </span>
      </div>

      <div className="ml-2 flex items-center gap-6">
        <Stat label="Portfolio return">
          <span className="font-mono text-base font-bold" style={{ color: ratioColor(portfolio.portfolio_ratio) }}>
            {formatRatio(portfolio.portfolio_ratio)}
          </span>
        </Stat>
        <Stat label="Spend">
          <span className="font-mono text-base font-bold text-cost">
            {formatUSD(portfolio.total_spend, { compact: true })}/mo
          </span>
        </Stat>
        <Stat label="Value">
          <span className="font-mono text-base font-bold text-value">
            {formatUSD(portfolio.total_value, { compact: true })}/mo
          </span>
        </Stat>
      </div>

      <div className="ml-auto flex items-center gap-4">
        <span className="hidden items-center gap-1.5 text-[10px] uppercase tracking-wider text-dim md:flex">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: agentMode === 'live' ? 'var(--value)' : 'var(--purple)' }}
          />
          agent: {agentMode}
        </span>
        <button
          type="button"
          onClick={() => setTab('alerts')}
          className="flex items-center gap-2 rounded-md border border-edge bg-slab px-3 py-1.5 transition-colors hover:border-shape"
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: openAlerts > 0 ? 'var(--shape)' : 'var(--dim)' }}
          />
          <span className="font-mono text-sm font-bold text-shape">{openAlerts}</span>
          <span className="text-xs text-sub">alerts</span>
        </button>
      </div>
    </header>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[10px] uppercase tracking-wider text-dim">{label}</span>
      {children}
    </div>
  );
}

