// Findings view-model — Wave 4 Slice 1.
// Ranks workloads worst value-ratio first and derives recommended action +
// projected monthly impact from existing cost-source findings (costsource/seed.ts).
// No new math — every figure traces to an existing field or finding.

import { WORKLOADS } from '@/data/workloads';
import { findingsFor } from '@/costsource/seed';
import { ratioColor } from '@/lib/scales';
import { SHAPE_LABEL } from '@/lib/demandShape';
import type { Workload } from '@/types';

// PointFive sandbox source has both anomaly and opportunity finding types.
const FINDINGS_SOURCE_ID = 'pointfive-sandbox';

// Gate 3 configured minimum — obvious.md Governance Gates (default 3×).
export const VALUE_MINIMUM = 3.0;

export interface FindingView {
  workloadId: string;
  workloadName: string;
  /** Evidence #1: current value ratio. */
  valueRatio: number;
  /** Ratio color from the existing ratio color scale. */
  valueColor: string;
  /** Evidence #2: current monthly spend. */
  monthlySpend: number;
  /** One-line problem summary. */
  problem: string;
  /** Single recommended action, derived from existing finding category + workload fields. */
  recommendedAction: string;
  /**
   * Projected monthly savings — hero figure.
   * From existing estimatedMonthlySavings (opportunity findings) or the
   * cost-trend implied overage (anomaly findings). Zero when no finding exists.
   */
  projectedMonthlyImpact: number;
  /** True when ratio is below the Gate 3 configured minimum. */
  belowMinimum: boolean;
}

const SEVERITY_RANK = { critical: 2, warning: 1, info: 0 } as const;

/** Build findings sorted worst value-ratio first. */
export function buildFindings(workloads: Workload[] = WORKLOADS): FindingView[] {
  const costFindings = findingsFor(FINDINGS_SOURCE_ID);

  return workloads
    .map((w): FindingView => {
      const ratio = w.value.value_ratio;

      // Pick the highest-severity finding to drive the recommendation.
      const ranked = costFindings
        .filter((f) => f.workloadId === w.id)
        .sort(
          (a, b) =>
            (SEVERITY_RANK[b.severity as keyof typeof SEVERITY_RANK] ?? 0) -
            (SEVERITY_RANK[a.severity as keyof typeof SEVERITY_RANK] ?? 0),
        );
      const worst = ranked[0];

      let recommendedAction: string;
      let projectedMonthlyImpact: number;

      if (!worst) {
        recommendedAction = 'Monitor — value ratio within acceptable range';
        projectedMonthlyImpact = 0;
      } else {
        // estimatedMonthlySavings covers opportunity findings (rightsizing / demand_shaping);
        // anomaly findings carry the cost-trend implied overage instead.
        projectedMonthlyImpact =
          worst.estimatedMonthlySavings > 0
            ? worst.estimatedMonthlySavings
            : Math.round(w.costs.monthly_spend * (w.cost_trend_pct / 100));

        switch (worst.category) {
          case 'spend_spike':
            recommendedAction = `Investigate spike — spend trending +${w.cost_trend_pct.toFixed(1)}% MoM`;
            break;
          case 'rightsizing':
            recommendedAction =
              w.demand_shape === 'always_on' || w.demand_shape === 'unmanaged'
                ? `Shape demand to ${SHAPE_LABEL['business_hours']} to reduce cost`
                : `Switch to a lower-tier model to improve value ratio`;
            break;
          case 'demand_shaping':
            recommendedAction = `Apply ${SHAPE_LABEL['throttled']} demand shaping — workload is unmanaged`;
            break;
          default:
            recommendedAction = 'Review workload configuration';
        }
      }

      const problem =
        ratio < 1.0
          ? 'Below break-even — spend exceeds value returned'
          : ratio < VALUE_MINIMUM
            ? `Returning ${ratio.toFixed(1)}\u00d7 — below the ${VALUE_MINIMUM}\u00d7 value minimum`
            : `Returning ${ratio.toFixed(1)}\u00d7 value per inference dollar`;

      return {
        workloadId: w.id,
        workloadName: w.name,
        valueRatio: ratio,
        valueColor: ratioColor(ratio),
        monthlySpend: w.costs.monthly_spend,
        problem,
        recommendedAction,
        projectedMonthlyImpact,
        belowMinimum: ratio < VALUE_MINIMUM,
      };
    })
    .sort((a, b) => a.valueRatio - b.valueRatio);
}

