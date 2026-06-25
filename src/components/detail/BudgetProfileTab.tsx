// Budget Profile tab — spec §3.4.1. Today's budget bar with thresholds, the
// monthly forecast with confidence interval + days-to-breach, and today's token
// consumption. The math comes from computeBudgetStatus (forecast §6).

import { useMemo } from 'react';
import type { BudgetProfile, Workload } from '@/types';
import { computeBudgetStatus, type BudgetStatus } from '@/lib/budgetStatus';
import { findModel } from '@/data/models';
import { formatPct, formatTokens, formatUSD } from '@/lib/format';
import { BudgetBar } from './BudgetBar';

const STATUS_COPY: Record<string, { label: string; color: string }> = {
  healthy: { label: 'Healthy', color: 'var(--value)' },
  soft: { label: 'Soft breach', color: 'var(--shape)' },
  hard: { label: 'Hard breach', color: 'var(--cost)' },
  kill: { label: 'Kill threshold', color: 'var(--cost)' },
  on_track: { label: 'On track', color: 'var(--value)' },
  at_risk: { label: 'At risk', color: 'var(--shape)' },
  breach_projected: { label: 'Breach projected', color: 'var(--cost)' },
};

export function BudgetProfileTab({
  workload,
  budget,
  now,
}: {
  workload: Workload;
  budget: BudgetProfile;
  now: Date;
}) {
  const status: BudgetStatus = useMemo(
    () => computeBudgetStatus(workload, budget, now),
    [workload, budget, now],
  );
  const tokens = useMemo(() => tokenBreakdown(workload), [workload]);

  const { daily, monthly } = status;
  const dailyStatus = STATUS_COPY[daily.status];
  const monthlyStatus = STATUS_COPY[monthly.status];

  return (
    <div className="space-y-6">
      <Section title="Today's budget" status={dailyStatus}>
        <BudgetBar
          pctUsed={daily.pctUsed}
          projectedPct={daily.projectedPctOfBudget}
          soft={budget.soft_threshold_pct}
          hard={budget.hard_threshold_pct}
          kill={budget.kill_threshold_pct}
        />
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-sub">
          <span className="text-txt">{formatPct(daily.pctUsed)} of {formatUSD(daily.dailyBudget)} daily</span>
          <span>{formatUSD(daily.spentToday)} spent</span>
          <span>{formatUSD(daily.remaining)} remaining</span>
          <span>{daily.hoursRemaining} hrs left</span>
        </div>
        <p className="mt-2 text-xs text-sub">
          Projected daily close:{' '}
          <span className="font-mono text-txt">{formatUSD(daily.projectedClose)}</span>{' '}
          ({formatPct(daily.projectedPctOfBudget)} of budget)
        </p>
      </Section>

      <Section title="Monthly forecast" status={monthlyStatus}>
        <BudgetBar
          pctUsed={monthly.pctUsed}
          projectedPct={monthly.projectedPctOfBudget}
          soft={0.7}
          hard={0.9}
          kill={1.0}
        />
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-sub">
          <span className="text-txt">{formatPct(monthly.pctUsed)} of {formatUSD(monthly.monthlyBudget)} monthly</span>
          <span>{formatUSD(monthly.spendMtd)} MTD</span>
          <span>{monthly.remainingDays} days remaining</span>
        </div>
        <p className="mt-2 text-xs text-sub">
          Projected month-end:{' '}
          <span className="font-mono text-txt">{formatUSD(monthly.projectedEom)}</span>{' '}
          ({formatPct(monthly.projectedPctOfBudget)} of budget)
        </p>
        <p className="mt-1 text-xs text-sub">
          80% confidence:{' '}
          <span className="font-mono text-txt">
            {formatUSD(monthly.confidence.low)} – {formatUSD(monthly.confidence.high)}
          </span>
          {monthly.daysUntilBreach !== null && (
            <span className="ml-2 text-cost">· breach in ~{monthly.daysUntilBreach} days</span>
          )}
        </p>
      </Section>

      <Section title="Token consumption (today)">
        <div className="overflow-hidden rounded-card border border-edge">
          <TokenRow label="Input" tokens={tokens.inputTokens} cost={tokens.inputCost} rate={tokens.inputRate} />
          <TokenRow label="Output" tokens={tokens.outputTokens} cost={tokens.outputCost} rate={tokens.outputRate} />
          <TokenRow label="Cache + infra" tokens={null} cost={tokens.otherCost} rate={null} />
          <div className="flex items-center justify-between bg-raised px-3 py-2 font-mono text-xs">
            <span className="font-bold text-txt">Total</span>
            <span className="text-sub">{formatTokens(tokens.totalTokens)} tokens</span>
            <span className="font-bold text-txt">{formatUSD(workload.costs.daily_spend)} so far</span>
          </div>
        </div>
      </Section>

      <Section title="Thresholds">
        <div className="space-y-1.5 font-mono text-xs">
          <ThresholdRow pct={budget.soft_threshold_pct} label="Soft alert" action="Slack + email" color="var(--value)" />
          <ThresholdRow pct={budget.hard_threshold_pct} label="Hard alert" action={`Escalate · ${budget.on_hard_breach}`} color="var(--shape)" />
          <ThresholdRow pct={budget.kill_threshold_pct} label="Kill switch" action={budget.on_kill_breach} color="var(--cost)" />
        </div>
        <p className="mt-2 text-[11px] text-dim">Edit these in the Demand Shaping tab's threshold controls.</p>
      </Section>
    </div>
  );
}

interface TokenBreakdown {
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  otherCost: number;
  totalTokens: number;
  inputRate: number;
  outputRate: number;
}

function tokenBreakdown(workload: Workload): TokenBreakdown {
  const model = findModel(workload.model);
  const inputRate = model?.pricing.input_per_1m ?? 0;
  const outputRate = model?.pricing.output_per_1m ?? 0;
  const inputCost = (workload.costs.tokens_in_today / 1_000_000) * inputRate;
  const outputCost = (workload.costs.tokens_out_today / 1_000_000) * outputRate;
  const otherCost = Math.max(workload.costs.daily_spend - inputCost - outputCost, 0);
  return {
    inputTokens: workload.costs.tokens_in_today,
    outputTokens: workload.costs.tokens_out_today,
    inputCost,
    outputCost,
    otherCost,
    totalTokens: workload.costs.tokens_in_today + workload.costs.tokens_out_today,
    inputRate,
    outputRate,
  };
}

function Section({
  title,
  status,
  children,
}: {
  title: string;
  status?: { label: string; color: string };
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-sub">{title}</h3>
        {status && (
          <span className="font-mono text-[10px] font-bold uppercase" style={{ color: status.color }}>
            {status.label}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function TokenRow({
  label,
  tokens,
  cost,
  rate,
}: {
  label: string;
  tokens: number | null;
  cost: number;
  rate: number | null;
}) {
  return (
    <div className="flex items-center justify-between border-b border-edge px-3 py-2 font-mono text-xs last:border-b-0">
      <span className="text-sub">{label}</span>
      <span className="text-dim">{tokens !== null ? `${formatTokens(tokens)} tokens` : '—'}</span>
      <span className="text-dim">{rate !== null ? `$${rate.toFixed(2)}/1M` : ''}</span>
      <span className="text-txt">{formatUSD(cost)}</span>
    </div>
  );
}

function ThresholdRow({
  pct,
  label,
  action,
  color,
}: {
  pct: number;
  label: string;
  action: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded border border-edge bg-slab px-3 py-1.5">
      <span className="w-10 font-bold" style={{ color }}>{(pct * 100).toFixed(0)}%</span>
      <span className="w-24 text-txt">{label}</span>
      <span className="text-sub">{action}</span>
    </div>
  );
}

