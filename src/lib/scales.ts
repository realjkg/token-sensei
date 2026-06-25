// Value-ratio + budget-bar color scales (spec §10.3, §10.4).
// Returns the design-token color name so callers can compose Tailwind classes
// or inline styles from a single source of truth.

import type { Workload } from '@/types';

export type RatioRating = 'excellent' | 'good' | 'marginal' | 'poor';

export const TOKEN_HEX = {
  value: '#00e09e',
  unit: '#00ccee',
  shape: '#ffc44d',
  cost: '#ff5c72',
  gate: '#7c8dff',
  purple: '#b490ff',
} as const;

// Spec §10.3: ≥10× excellent, 5–9.9× good, 2–4.9× marginal, <2× poor.
export function ratioRating(ratio: number): RatioRating {
  if (ratio >= 10) return 'excellent';
  if (ratio >= 5) return 'good';
  if (ratio >= 2) return 'marginal';
  return 'poor';
}

export function ratioColor(ratio: number): string {
  switch (ratioRating(ratio)) {
    case 'excellent':
      return TOKEN_HEX.value;
    case 'good':
      return TOKEN_HEX.unit;
    case 'marginal':
      return TOKEN_HEX.shape;
    case 'poor':
      return TOKEN_HEX.cost;
  }
}

// Spec §10.4: budget bar fill color by utilization fraction.
export function budgetColor(pctUsed: number): string {
  if (pctUsed >= 0.9) return TOKEN_HEX.cost;
  if (pctUsed >= 0.7) return TOKEN_HEX.shape;
  return TOKEN_HEX.value;
}

export type ThresholdStatus = 'healthy' | 'soft' | 'hard' | 'kill';

export function thresholdStatus(
  pctUsed: number,
  soft: number,
  hard: number,
  kill: number,
): ThresholdStatus {
  if (pctUsed >= kill) return 'kill';
  if (pctUsed >= hard) return 'hard';
  if (pctUsed >= soft) return 'soft';
  return 'healthy';
}

export const PROVIDER_LABEL: Record<Workload['model_provider'], string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  aws_bedrock: 'AWS Bedrock',
  azure_openai: 'Azure OpenAI',
  custom: 'Custom',
};

