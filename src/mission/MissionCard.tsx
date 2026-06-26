// Mission card (Ratio v2 Workstream 1, Layer 1). One workload rendered as a
// mission: plain-language name, status pulse, fuel gauge + value badge (R4), and
// a one-line trajectory verdict. Rounded, character-driven treatment over the
// durable tokens — no new brand colors. Drill-down (Mission Detail) is PR B.
import { motion, useReducedMotion } from 'framer-motion';
import { TOKEN_HEX } from '@/lib/scales';
import { FuelAndValue } from './FuelAndValue';
import type { MissionStatus, MissionView } from './missionModel';
import { StatusPulse } from './StatusPulse';

const STATUS_META: Record<MissionStatus, { label: string; color: string }> = {
  nominal: { label: 'NOMINAL', color: TOKEN_HEX.value },
  caution: { label: 'CAUTION', color: TOKEN_HEX.shape },
  critical: { label: 'CRITICAL', color: TOKEN_HEX.cost },
};

interface MissionCardProps {
  mission: MissionView;
}

export function MissionCard({ mission }: MissionCardProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const meta = STATUS_META[mission.status];

  return (
    <motion.article
      className="flex flex-col gap-4 rounded-2xl border border-edge bg-slab p-5"
      style={{ borderTop: `3px solid ${meta.color}` }}
      whileHover={reducedMotion ? undefined : { y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
    >
      {/* Header: plain-language mission name + live status pulse */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-body text-base font-semibold text-txt">{mission.name}</h3>
          <p className="mt-0.5 truncate font-mono text-xs text-dim">
            {mission.model} · {mission.providerLabel} · {mission.team}
          </p>
        </div>
        <StatusPulse status={mission.status} />
      </header>

      {/* Status label */}
      <div className="flex items-center gap-2">
        <span
          className="rounded-full px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest"
          style={{ color: meta.color, backgroundColor: `${meta.color}1a` }}
        >
          {meta.label}
        </span>
        {mission.alertCount > 0 && (
          <span className="font-mono text-[10px] text-sub">
            {mission.alertCount} active {mission.alertCount === 1 ? 'warning' : 'warnings'}
          </span>
        )}
      </div>

      {/* Fuel gauge + value badge (R4 — never one without the other) */}
      <FuelAndValue
        fuelPct={mission.fuelPct}
        fuelColor={mission.fuelColor}
        spentToday={mission.spentToday}
        dailyBudget={mission.dailyBudget}
        valueRatio={mission.valueRatio}
        valueColor={mission.valueColor}
      />

      {/* Trajectory verdict (monthly forecast, plain language) */}
      <p className="flex items-start gap-1.5 border-t border-edge pt-3 text-sm text-sub">
        <span aria-hidden style={{ color: meta.color }}>
          ↗
        </span>
        <span>{mission.trajectoryVerdict}</span>
      </p>
    </motion.article>
  );
}

