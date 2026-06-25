// Footer alert ticker — spec §3.6. Single-line scrolling ticker of the most
// recent alerts; clicking an item jumps to that workload's Alert History.

import { useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { timeAgo } from '@/lib/format';
import { DEMO_NOW } from '@/data/workloads';
import type { Alert, AlertSeverity } from '@/types';

const SEVERITY_COLOR: Record<AlertSeverity, string> = {
  info: 'var(--unit)',
  warning: 'var(--shape)',
  critical: 'var(--cost)',
};

function severityIcon(severity: AlertSeverity): string {
  if (severity === 'critical') return '◉';
  if (severity === 'warning') return '△';
  return '○';
}

export function Footer() {
  const alerts = useStore((s) => s.alerts);
  const workloads = useStore((s) => s.workloads);
  const select = useStore((s) => s.select);
  const setTab = useStore((s) => s.setTab);

  const sorted = useMemo(
    () =>
      [...alerts].sort(
        (a, b) => new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime(),
      ),
    [alerts],
  );

  const nameFor = (id: string) => workloads.find((w) => w.id === id)?.name ?? id;

  const onClick = (alert: Alert) => {
    select(alert.workload_id);
    setTab('alerts');
  };

  // Duplicate the list so the marquee loops seamlessly (translateX -50%).
  const items = [...sorted, ...sorted];

  return (
    <footer className="flex h-8 shrink-0 items-center overflow-hidden border-t border-edge bg-deep">
      <span className="flex h-full items-center gap-1.5 border-r border-edge bg-slab px-3 text-[10px] font-bold uppercase tracking-wider text-dim">
        Live alerts
      </span>
      <div className="relative flex-1 overflow-hidden">
        <div className="animate-ticker flex w-max items-center gap-8 whitespace-nowrap px-4">
          {items.map((alert, i) => (
            <button
              key={`${alert.id}-${i}`}
              type="button"
              onClick={() => onClick(alert)}
              className="flex items-center gap-2 text-xs text-sub transition-colors hover:text-txt"
            >
              <span style={{ color: SEVERITY_COLOR[alert.severity] }}>
                {severityIcon(alert.severity)}
              </span>
              <span className="font-mono font-medium text-txt">{nameFor(alert.workload_id)}:</span>
              <span>{alert.message}</span>
              <span className="text-dim">· {timeAgo(alert.triggered_at, DEMO_NOW)}</span>
            </button>
          ))}
        </div>
      </div>
    </footer>
  );
}

