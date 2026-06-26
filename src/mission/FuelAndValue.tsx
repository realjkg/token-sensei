// Fuel gauge + value badge, deliberately fused into one component so a fuel
// gauge can NEVER render without its value ratio (R4 — value is the denominator).
// The gauge is an accessible progressbar; the bar fill animates with Framer
// Motion and respects prefers-reduced-motion.
import { motion, useReducedMotion } from 'framer-motion';
import { formatRatio, formatUSD } from '@/lib/format';

interface FuelAndValueProps {
  fuelPct: number;
  fuelColor: string;
  spentToday: number;
  dailyBudget: number;
  valueRatio: number;
  valueColor: string;
}

export function FuelAndValue({
  fuelPct,
  fuelColor,
  spentToday,
  dailyBudget,
  valueRatio,
  valueColor,
}: FuelAndValueProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const valueText = `${fuelPct}% of daily budget used — ${formatUSD(spentToday)} spent of ${formatUSD(
    dailyBudget,
  )}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono uppercase tracking-wider text-dim">Fuel</span>
        {/* R4: the value badge is part of the same component as the gauge. */}
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-xs font-bold"
          style={{ color: valueColor, backgroundColor: `${valueColor}1a` }}
        >
          {formatRatio(valueRatio)} return
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={fuelPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={valueText}
        aria-label="Daily fuel (budget consumed)"
        className="h-2.5 w-full overflow-hidden rounded-full bg-raised"
      >
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: fuelColor }}
          initial={reducedMotion ? false : { width: 0 }}
          animate={{ width: `${fuelPct}%` }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      <div className="flex items-center justify-between font-mono text-xs text-sub">
        <span>{fuelPct}%</span>
        <span>
          {formatUSD(spentToday)} <span className="text-dim">/ {formatUSD(dailyBudget)}</span>
        </span>
      </div>
    </div>
  );
}

