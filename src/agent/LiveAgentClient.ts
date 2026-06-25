// Live Claude client — the real drop-in behind the AgentClient seam (spec §7).
// Only instantiated when VITE_ANTHROPIC_API_KEY is set; the app ships with the
// mock client so it runs with no key. The system prompt is rebuilt per query
// with current workload data per §7.1.

import { derivePortfolioRatio } from '@/lib/derive';
import { formatRatio, formatUSD } from '@/lib/format';
import type { AgentClient, AgentContext, AgentReply } from './AgentClient';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

function buildSystemPrompt(ctx: AgentContext): string {
  const portfolio = derivePortfolioRatio(ctx.workloads);
  const workloadLines = ctx.workloads
    .map(
      (w) =>
        `- ${w.name} (${w.team}, ${w.environment}): model ${w.model}, ${formatUSD(
          w.costs.monthly_spend,
        )}/mo at ${formatRatio(w.value.value_ratio)} return, shape ${w.demand_shape}, trend ${w.cost_trend_pct}%`,
    )
    .join('\n');
  const modelLines = ctx.models
    .map(
      (m) =>
        `- ${m.display_name} (${m.provider}): $${m.pricing.input_per_1m}/1M in, $${m.pricing.output_per_1m}/1M out [${m.cost_tier}]`,
    )
    .join('\n');
  const alertLines = ctx.alerts
    .filter((a) => !a.acknowledged)
    .map((a) => `- [${a.severity}] ${a.type}: ${a.message}`)
    .join('\n');

  return [
    'IDENTITY:',
    'You are the Ratio Agent — an AI-native FinOps operator for AI workloads. You govern value ratios, not just costs.',
    '',
    'PRINCIPLES (non-negotiable):',
    '1. Every cost you cite MUST include its value ratio.',
    "2. Never recommend scaling a workload that hasn't passed all 4 governance gates.",
    '3. For budget/forecast: include current spend, daily budget, projected close, and confidence interval.',
    '4. For a model switch: state cost savings, potential quality impact, and suggest an A/B test first.',
    '5. For throttle/pause: state the VALUE that will be lost, not just the cost saved.',
    '',
    `PORTFOLIO: ${formatRatio(portfolio.portfolio_ratio)} return, ${formatUSD(
      portfolio.total_value,
    )}/mo value on ${formatUSD(portfolio.total_spend)}/mo spend.`,
    '',
    'WORKLOAD DATA:',
    workloadLines,
    '',
    'MODEL REGISTRY:',
    modelLines,
    '',
    'ACTIVE ALERTS:',
    alertLines || '- none',
  ].join('\n');
}

export class LiveAgentClient implements AgentClient {
  readonly mode = 'live' as const;
  constructor(private readonly apiKey: string) {}

  async ask(query: string, ctx: AgentContext): Promise<AgentReply> {
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 800,
        system: buildSystemPrompt(ctx),
        messages: [{ role: 'user', content: query }],
      }),
    });
    if (!res.ok) {
      throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as { content: Array<{ type: string; text?: string }> };
    const text = data.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text ?? '')
      .join('\n');
    return { text, workloadsReferenced: [] };
  }
}

