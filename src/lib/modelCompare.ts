// Multi-model cost comparison — spec §3.4.2, §8, §14.2 /workloads/{id}/models.
// Given a workload's volume, compute what every registry model would cost so a
// developer sees the cost/quality tradeoff before switching (R1).

import type { ModelEntry } from '@/types';

export interface VolumeProfile {
  calls: number;
  avgInputTokens: number;
  avgOutputTokens: number;
}

export interface ModelCostRow {
  model: ModelEntry;
  inputCost: number; // daily input cost at this volume
  outputCost: number; // daily output cost at this volume
  dailyCost: number;
  monthlyCost: number;
  savingsPct: number; // vs the current model, negative = cheaper
  isCurrent: boolean;
}

export function modelDailyCost(model: ModelEntry, volume: VolumeProfile): { input: number; output: number; total: number } {
  const input = (volume.calls * volume.avgInputTokens) / 1_000_000 * model.pricing.input_per_1m;
  const output = (volume.calls * volume.avgOutputTokens) / 1_000_000 * model.pricing.output_per_1m;
  return { input, output, total: input + output };
}

export function compareModels(
  registry: ModelEntry[],
  currentModelName: string,
  volume: VolumeProfile,
): ModelCostRow[] {
  const current = registry.find((m) => m.model_name === currentModelName);
  const baseDaily = current ? modelDailyCost(current, volume).total : 0;

  const rows: ModelCostRow[] = registry.map((model) => {
    const cost = modelDailyCost(model, volume);
    const savingsPct = baseDaily > 0 ? ((cost.total - baseDaily) / baseDaily) * 100 : 0;
    return {
      model,
      inputCost: cost.input,
      outputCost: cost.output,
      dailyCost: cost.total,
      monthlyCost: cost.total * 30,
      savingsPct,
      isCurrent: model.model_name === currentModelName,
    };
  });

  // §3.4.2: default sort by daily cost ascending (cheapest first).
  return rows.sort((a, b) => a.dailyCost - b.dailyCost);
}

// Best cheaper alternative to the current model, used by the agent responder.
export function cheapestAlternative(rows: ModelCostRow[]): ModelCostRow | null {
  const current = rows.find((r) => r.isCurrent);
  if (!current) return null;
  const cheaper = rows.filter((r) => !r.isCurrent && r.dailyCost < current.dailyCost);
  if (cheaper.length === 0) return null;
  return cheaper.reduce((min, r) => (r.dailyCost < min.dailyCost ? r : min), cheaper[0]);
}

