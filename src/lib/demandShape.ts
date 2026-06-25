// Demand-shaping projections — spec §2, §3.4.4, §14.2 /workloads/{id}/shape.
// Each shape implies a multiplier on the workload's always-on monthly spend.

import type { DemandShape, Workload } from '@/types';
import { allGatesPassed } from './derive';

// Relative monthly cost factors per shape vs. always-on baseline.
export const SHAPE_FACTOR: Record<DemandShape, number> = {
  always_on: 1.0,
  business_hours: 0.74,
  throttled: 0.6,
  batch_offpeak: 0.3,
  paused: 0.0,
  unmanaged: 1.12, // no controls — tends to overspend
};

export const SHAPE_LABEL: Record<DemandShape, string> = {
  always_on: 'Always On',
  business_hours: 'Business Hours',
  throttled: 'Throttled',
  batch_offpeak: 'Batch Off-Peak',
  paused: 'Paused',
  unmanaged: 'Unmanaged',
};

export const SHAPE_DESCRIPTION: Record<DemandShape, string> = {
  always_on: 'Runs 24/7 at full demand. Highest cost, lowest latency.',
  business_hours: 'Active 9–5 on weekdays; idle overnight and weekends.',
  throttled: 'Rate-limited to cap concurrent inference and smooth spend.',
  batch_offpeak: 'Queued and run in off-peak batches at batch pricing.',
  paused: 'No inference. Zero spend, zero value delivered.',
  unmanaged: 'No demand controls applied — spend follows raw traffic.',
};

export interface ShapeProjection {
  shape: DemandShape;
  projectedMonthly: number;
  blockedReason: string | null;
}

// Baseline = the always-on monthly spend implied by current run rate.
// A paused workload (factor 0) carries no run rate to extrapolate from, so we
// fall back to its stored monthly spend rather than dividing by zero.
export function alwaysOnBaseline(workload: Workload): number {
  const factor = SHAPE_FACTOR[workload.demand_shape] || 0;
  return factor > 0 ? workload.costs.monthly_spend / factor : workload.costs.monthly_spend;
}

export function shapeProjections(workload: Workload): ShapeProjection[] {
  const baseline = alwaysOnBaseline(workload);
  const gatesOk = allGatesPassed(workload);
  const order: DemandShape[] = [
    'always_on',
    'business_hours',
    'throttled',
    'batch_offpeak',
    'paused',
    'unmanaged',
  ];
  return order.map((shape) => ({
    shape,
    projectedMonthly: baseline * SHAPE_FACTOR[shape],
    // §5.3: "Always On" is blocked unless all four governance gates pass.
    blockedReason:
      shape === 'always_on' && !gatesOk ? 'Requires all 4 governance gates' : null,
  }));
}

