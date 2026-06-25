// Maps a Ratio Workload to a FOCUS v1.1 FocusRow. This is where the
// cost-and-value thesis lands: standard FOCUS columns carry cost, x_Ratio*
// extensions carry the value-ratio that lets agents reason over value, not
// just dollars.

import { findModel } from '@/data/models';
import type { Workload } from '@/types';
import type { FocusRow } from './FinioClient';

/** Returns the current-month billing period as UTC ISO strings. */
export function currentBillingPeriod(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

/** Resolves the FOCUS ProviderName from the workload's model_provider. */
function providerNameOf(w: Workload): string {
  const map: Record<string, string> = {
    anthropic: 'anthropic',
    openai: 'openai',
    google: 'google',
    aws_bedrock: 'aws',
    azure_openai: 'microsoft',
    custom: 'custom',
  };
  return map[w.model_provider] ?? w.model_provider;
}

/** Resolves the FOCUS ServiceName from the model registry display_name. */
function serviceNameOf(w: Workload): string {
  return findModel(w.model)?.display_name ?? w.model;
}

/** Counts governance gates that have been passed (0–4). */
export function governanceGatesPassed(w: Workload): number {
  const g = w.governance;
  return (
    (g.policy_check ? 1 : 0) +
    (g.ethics_review ? 1 : 0) +
    (g.cost_approval ? 1 : 0) +
    (g.scale_authorized ? 1 : 0)
  );
}

/**
 * Maps a single Workload to a FOCUS v1.1 FocusRow.
 *
 * v1 note: no commitment discounts exist yet, so EffectiveCost == BilledCost.
 * ChargeDescriptions follow the pattern "<Name> (<team>/<env>)".
 */
export function workloadToFocusRow(
  w: Workload,
  period: { start: string; end: string },
): FocusRow {
  return {
    BilledCost: w.costs.monthly_spend,
    EffectiveCost: w.costs.monthly_spend,
    BillingCurrency: 'USD',
    BillingPeriodStart: period.start,
    BillingPeriodEnd: period.end,
    ChargePeriodStart: period.start,
    ChargePeriodEnd: period.end,
    ServiceName: serviceNameOf(w),
    ServiceCategory: 'AI and Machine Learning',
    ProviderName: providerNameOf(w),
    ChargeDescription: `${w.name} (${w.team}/${w.environment})`,
    x_RatioWorkloadId: w.id,
    x_RatioValueRatio: w.value.value_ratio,
    x_RatioTotalValue: w.value.total_value,
    x_RatioDemandShape: w.demand_shape,
    x_RatioGovernanceGates: governanceGatesPassed(w),
  };
}

/** Maps an array of Workloads to FOCUS rows for the current billing period. */
export function workloadsToFocusRows(workloads: Workload[]): FocusRow[] {
  const period = currentBillingPeriod();
  return workloads.map((w) => workloadToFocusRow(w, period));
}

