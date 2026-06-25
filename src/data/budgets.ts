// Budget profile seed — spec §2.3. Built from each workload's run rate so the
// forecast (§6) has a real daily-spend history + daily allocation to work from.

import type { BudgetProfile } from '@/types';
import { WORKLOAD_SEED_SPECS, historyFor } from './workloads';

export const BUDGET_PROFILES: BudgetProfile[] = WORKLOAD_SEED_SPECS.map((spec) => {
  const base = spec.monthlySpend / 30;
  return {
    id: `bp-${spec.id}`,
    workload_id: spec.id,
    period: 'monthly',
    budget_amount: spec.monthlyBudget,
    soft_threshold_pct: 0.7,
    hard_threshold_pct: 0.9,
    kill_threshold_pct: 1.0,
    daily_allocation: {
      weekday: round2(base * 1.08),
      weekend: round2(base * 0.62),
      peak_hour_start: 9,
      peak_hour_end: 17,
      peak_multiplier: 1.4,
    },
    forecast_method: 'weighted_avg_7d',
    daily_spend_history: historyFor(spec.monthlySpend, spec.volatility),
    on_soft_breach: 'alert_and_log',
    on_hard_breach: 'throttle_50pct',
    on_kill_breach: spec.demand_shape === 'always_on' ? 'throttle_90pct' : 'pause_workload',
  };
});

export function budgetFor(workloadId: string): BudgetProfile | undefined {
  return BUDGET_PROFILES.find((b) => b.workload_id === workloadId);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

