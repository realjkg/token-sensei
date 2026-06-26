// Accuracy report composition — rolls the ledger up into the AccuracyReport the
// demo page and the API route consume: overall p50/p90, per-change-type stats,
// every source/change-type error distribution, and the cold-start flag.

import type {
  AccuracyReport,
  AccuracyStats,
  ChangeType,
  LedgerEntry,
  SourceErrorDistribution,
} from './PredictionClient';
import { accuracyStats } from './accuracy';
import { filterEntries, rollingErrorDistribution } from './ledger';
import { CANDIDATE_SOURCES } from './sourceSelection';

const CHANGE_TYPES: ChangeType[] = [
  'model_switch',
  'demand_shape',
  'scale',
  'budget',
];

export function buildAccuracyReport(entries: LedgerEntry[]): AccuracyReport {
  const byChangeType = Object.fromEntries(
    CHANGE_TYPES.map((ct) => [
      ct,
      accuracyStats(filterEntries(entries, { changeType: ct })),
    ]),
  ) as Record<ChangeType, AccuracyStats>;

  const distributions: SourceErrorDistribution[] = [];
  for (const ct of CHANGE_TYPES) {
    for (const source of CANDIDATE_SOURCES) {
      distributions.push(rollingErrorDistribution(entries, source, ct));
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    coldStart: !distributions.some((d) => d.hasEnoughHistory),
    totalEntries: entries.length,
    overall: accuracyStats(entries),
    byChangeType,
    distributions,
  };
}

