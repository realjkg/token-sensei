// Data-grounded mock agent — spec §3.5, §7. Answers the spec's example prompts
// by computing real numbers from the seed data. Follows the §7.1 principles:
// every cost is paired with its value ratio; model switches always flag quality
// impact + A/B test; throttle/pause always states the value at risk.

import type { Workload } from '@/types';
import { derivePortfolioRatio, governanceGatesPassed } from '@/lib/derive';
import { computeBudgetStatus } from '@/lib/budgetStatus';
import { cheapestAlternative, compareModels } from '@/lib/modelCompare';
import { MODEL_QUALITY_NOTE } from '@/data/models';
import { formatRatio, formatSignedPct, formatUSD } from '@/lib/format';
import type { AgentClient, AgentContext, AgentReply } from './AgentClient';

type Intent =
  | 'spend_spike'
  | 'model_switch'
  | 'riskiest'
  | 'budget_status'
  | 'report'
  | 'help';

function classify(query: string): Intent {
  const q = query.toLowerCase();
  if (/(spik|surg|why.*up|increas|jump)/.test(q)) return 'spend_spike';
  if (/(switch|cheaper|model|swap|downgrade)/.test(q)) return 'model_switch';
  if (/(riskiest|worst|at risk|sunset|underperform)/.test(q)) return 'riskiest';
  if (/(budget|today|status|forecast|spend)/.test(q)) return 'budget_status';
  if (/(report|summary|summarise|summarize)/.test(q)) return 'report';
  return 'help';
}

function focusOrDefault(ctx: AgentContext, fallback: Workload): Workload {
  if (ctx.focusWorkloadId) {
    const found = ctx.workloads.find((w) => w.id === ctx.focusWorkloadId);
    if (found) return found;
  }
  return fallback;
}

function byTrendDesc(workloads: Workload[]): Workload[] {
  return [...workloads].sort((a, b) => b.cost_trend_pct - a.cost_trend_pct);
}
function byRatioAsc(workloads: Workload[]): Workload[] {
  return [...workloads].sort((a, b) => a.value.value_ratio - b.value.value_ratio);
}

function spendSpike(ctx: AgentContext): AgentReply {
  const top = byTrendDesc(ctx.workloads)[0];
  const second = byTrendDesc(ctx.workloads)[1];
  const text = [
    `Today's biggest spend mover is **${top.name}** (${top.team}), up ${formatSignedPct(top.cost_trend_pct, 1)} month-over-month.`,
    `It's running ${top.model} and currently spends ${formatUSD(top.costs.monthly_spend)}/mo at ${formatRatio(top.value.value_ratio)} return — ${ratingWord(top.value.value_ratio)}.`,
    top.demand_shape === 'unmanaged'
      ? `The spike is amplified because its demand shape is UNMANAGED: spend is tracking raw traffic with no throttling.`
      : `Input tokens today: ${(top.costs.tokens_in_today / 1e6).toFixed(1)}M, output: ${(top.costs.tokens_out_today / 1e6).toFixed(1)}M.`,
    `Second mover: ${second.name} at ${formatSignedPct(second.cost_trend_pct, 1)} (${formatUSD(second.costs.monthly_spend)}/mo at ${formatRatio(second.value.value_ratio)} return).`,
    top.value.value_ratio < 3
      ? `Because ${top.name}'s ratio is below 3\u00d7, I'd shape demand before it scales further — you'd protect ${formatUSD(top.value.total_value)}/mo of value while cutting spend.`
      : `Its value ratio still justifies the spend, but set a tighter daily threshold to cap the trend.`,
  ].join(' ');
  return { text, workloadsReferenced: [top.id, second.id] };
}

function modelSwitch(ctx: AgentContext): AgentReply {
  const wl = focusOrDefault(ctx, byTrendDesc(ctx.workloads)[0]);
  const volume = {
    calls: wl.outputs.daily_inferences,
    avgInputTokens: Math.round(wl.costs.tokens_in_today / Math.max(wl.outputs.daily_inferences, 1)),
    avgOutputTokens: Math.round(
      wl.costs.tokens_out_today / Math.max(wl.outputs.daily_inferences, 1),
    ),
  };
  const rows = compareModels(ctx.models, wl.model, volume);
  const current = rows.find((r) => r.isCurrent);
  const alt = cheapestAlternative(rows);
  if (!current || !alt) {
    return {
      text: `${wl.name} is already on the cheapest model in the registry for its volume. No switch would save money without changing the workload.`,
      workloadsReferenced: [wl.id],
    };
  }
  const dailySaving = current.dailyCost - alt.dailyCost;
  const monthlySaving = dailySaving * 30;
  const note = MODEL_QUALITY_NOTE[alt.model.model_name] ?? 'May change resolution quality.';
  const text = [
    `For **${wl.name}** (currently ${wl.model} at ${formatUSD(wl.costs.monthly_spend)}/mo, ${formatRatio(wl.value.value_ratio)} return):`,
    `the cheapest comparable model at today's volume (${volume.calls.toLocaleString()} calls) is **${alt.model.display_name}** — ${formatUSD(alt.dailyCost)}/day vs ${formatUSD(current.dailyCost)}/day now.`,
    `That saves ~${formatUSD(dailySaving)}/day (${formatUSD(monthlySaving)}/mo) and, at the same value, would lift the ratio above ${formatRatio(wl.value.value_ratio)}.`,
    `Quality caveat: ${note} Run an A/B test on resolution rate before committing — a cheaper model that drops resolutions can erase the savings in lost value.`,
  ].join(' ');
  return { text, workloadsReferenced: [wl.id] };
}

function riskiest(ctx: AgentContext): AgentReply {
  const worst = byRatioAsc(ctx.workloads)[0];
  const gates = governanceGatesPassed(worst);
  const text = [
    `Your riskiest workload is **${worst.name}** (${worst.team}) at ${formatRatio(worst.value.value_ratio)} return — ${ratingWord(worst.value.value_ratio)}.`,
    `It spends ${formatUSD(worst.costs.monthly_spend)}/mo and returns ${formatUSD(worst.value.total_value)}/mo of value (${formatUSD(worst.value.revenue_protected)} revenue protected + ${formatUSD(worst.value.cost_avoided)} cost avoided).`,
    worst.value.value_ratio < 2
      ? `Below the 2\u00d7 critical floor: I'd recommend demand shaping (throttle or batch-offpeak) or a sunset review. Pausing it would save ${formatUSD(worst.costs.monthly_spend)}/mo but forfeit ${formatUSD(worst.value.total_value)}/mo of value — weigh that before acting.`
      : `It clears the 2\u00d7 floor but trails the portfolio; tighten its budget and re-check the value ratio weekly.`,
    `Governance: ${gates}/4 gates passed${gates < 4 ? ' — it cannot be cleared for Always-On scale until all four pass.' : '.'}`,
  ].join(' ');
  return { text, workloadsReferenced: [worst.id] };
}

function budgetStatus(ctx: AgentContext): AgentReply {
  const portfolio = derivePortfolioRatio(ctx.workloads);
  const lines: string[] = [];
  let totalSpentToday = 0;
  let totalProjectedClose = 0;
  const referenced: string[] = [];

  for (const wl of byRatioAsc(ctx.workloads)) {
    const budget = ctx.budgets.find((b) => b.workload_id === wl.id);
    if (!budget) continue;
    const status = computeBudgetStatus(wl, budget, ctx.now);
    totalSpentToday += status.daily.spentToday;
    totalProjectedClose += status.daily.projectedClose;
  }

  // Highlight the workloads closest to a daily breach.
  const hot = ctx.workloads
    .map((wl) => {
      const budget = ctx.budgets.find((b) => b.workload_id === wl.id);
      if (!budget) return null;
      const status = computeBudgetStatus(wl, budget, ctx.now);
      return { wl, pct: status.daily.pctUsed, status };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3);

  for (const { wl, status } of hot) {
    referenced.push(wl.id);
    lines.push(
      `• ${wl.name}: ${formatUSD(status.daily.spentToday)} of ${formatUSD(status.daily.dailyBudget)} (${(status.daily.pctUsed * 100).toFixed(0)}%), projected close ${formatUSD(status.daily.projectedClose)} — ${formatRatio(wl.value.value_ratio)} return.`,
    );
  }

  const text = [
    `Portfolio today: ${formatUSD(totalSpentToday)} spent so far, projected daily close ${formatUSD(totalProjectedClose)}.`,
    `Portfolio value ratio: ${formatRatio(portfolio.portfolio_ratio)} (${formatUSD(portfolio.total_value)}/mo value on ${formatUSD(portfolio.total_spend)}/mo spend).`,
    `${portfolio.below_threshold} workload(s) sit below the 3\u00d7 review threshold.`,
    'Closest to their daily budget:',
    ...lines,
  ].join('\n');
  return { text, workloadsReferenced: referenced };
}

function report(ctx: AgentContext): AgentReply {
  const portfolio = derivePortfolioRatio(ctx.workloads);
  const bySpend = [...ctx.workloads].sort(
    (a, b) => b.costs.monthly_spend - a.costs.monthly_spend,
  );
  const topSpend = bySpend.slice(0, 3);
  const best = portfolio.best;
  const worst = portfolio.worst;
  const openAlerts = ctx.alerts.filter((a) => !a.acknowledged).length;

  const text = [
    `**Daily cost report — ${ctx.now.toISOString().slice(0, 10)}**`,
    `Portfolio: ${formatUSD(portfolio.total_spend)}/mo spend, ${formatUSD(portfolio.total_value)}/mo value, ${formatRatio(portfolio.portfolio_ratio)} return.`,
    `Open alerts: ${openAlerts}.`,
    'Top spend:',
    ...topSpend.map(
      (w) => `• ${w.name}: ${formatUSD(w.costs.monthly_spend)}/mo at ${formatRatio(w.value.value_ratio)} return.`,
    ),
    best ? `Best ratio: ${best.name} at ${formatRatio(best.ratio)}.` : '',
    worst ? `Worst ratio: ${worst.name} at ${formatRatio(worst.ratio)} — needs review.` : '',
  ]
    .filter(Boolean)
    .join('\n');
  return { text, workloadsReferenced: topSpend.map((w) => w.id) };
}

function help(): AgentReply {
  return {
    text: [
      "I'm the Ratio agent. I govern value ratios, not just cost. Try:",
      '• "Why is my spend spiking?"',
      '• "Which model should I switch to?"',
      "• \"What's my riskiest workload?\"",
      '• "Show today\'s budget status"',
      '• "Give me today\'s cost report"',
      'Every number I cite comes with its value ratio — cost without value is just spend.',
    ].join('\n'),
    workloadsReferenced: [],
  };
}

function ratingWord(ratio: number): string {
  if (ratio >= 10) return 'excellent';
  if (ratio >= 5) return 'good';
  if (ratio >= 2) return 'marginal';
  return 'poor';
}

export class MockAgentClient implements AgentClient {
  readonly mode = 'mock' as const;

  async ask(query: string, ctx: AgentContext): Promise<AgentReply> {
    // Small delay so the UI shows a realistic "thinking" state.
    await new Promise((resolve) => setTimeout(resolve, 320));
    switch (classify(query)) {
      case 'spend_spike':
        return spendSpike(ctx);
      case 'model_switch':
        return modelSwitch(ctx);
      case 'riskiest':
        return riskiest(ctx);
      case 'budget_status':
        return budgetStatus(ctx);
      case 'report':
        return report(ctx);
      case 'help':
        return help();
    }
  }
}

