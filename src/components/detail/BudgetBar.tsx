// Budget bar — spec §3.4.1 + §10.4. Fill colored by utilization, soft/hard/kill
// threshold markers, and a semi-transparent projected-overshoot extension past
// 100%. Pure presentational: all numbers are passed in.

import { budgetColor } from '@/lib/scales';

export function BudgetBar({
  pctUsed,
  projectedPct,
  soft,
  hard,
  kill,
}: {
  pctUsed: number;
  projectedPct: number;
  soft: number;
  hard: number;
  kill: number;
}) {
  const fillPct = Math.min(pctUsed, 1) * 100;
  const fillColor = budgetColor(pctUsed);
  // Overshoot = projected spend beyond 100%, drawn faint red past the fill.
  const overshootPct = Math.max(Math.min(projectedPct, 1.4) - 1, 0) * 100;

  return (
    <div className="relative h-6 w-full overflow-hidden rounded bg-void">
      <div
        className="absolute inset-y-0 left-0 rounded-l transition-all"
        style={{ width: `${fillPct}%`, background: fillColor }}
      />
      {overshootPct > 0 && (
        <div
          className="absolute inset-y-0"
          style={{
            left: '100%',
            width: `${overshootPct}%`,
            background: 'var(--cost)',
            opacity: 0.4,
            transform: 'translateX(-100%)',
          }}
        />
      )}
      <Marker pct={soft} />
      <Marker pct={hard} />
      <Marker pct={kill} />
    </div>
  );
}

function Marker({ pct }: { pct: number }) {
  return (
    <div
      className="absolute inset-y-0 w-px bg-txt/40"
      style={{ left: `${Math.min(pct, 1) * 100}%` }}
      title={`${(pct * 100).toFixed(0)}% threshold`}
    />
  );
}

