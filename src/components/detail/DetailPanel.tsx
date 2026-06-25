// Center panel — tabbed detail for the selected workload (spec §3.4). Workload
// header, KPI cards, tab nav, and the active tab body.

import { useStore, type DetailTab } from '@/store/useStore';
import { formatInt, formatRatio } from '@/lib/format';
import { ratioColor, PROVIDER_LABEL } from '@/lib/scales';
import { KpiCards } from './KpiCards';
import { BudgetProfileTab } from './BudgetProfileTab';
import { MultiModelTab } from './MultiModelTab';
import { GovernanceTab } from './GovernanceTab';
import { DemandShapingTab } from './DemandShapingTab';
import { UnitCostsTab } from './UnitCostsTab';
import { AlertHistoryTab } from './AlertHistoryTab';

const TABS: Array<{ id: DetailTab; label: string }> = [
  { id: 'budget', label: 'Budget Profile' },
  { id: 'models', label: 'Multi-Model' },
  { id: 'governance', label: 'Governance' },
  { id: 'demand', label: 'Demand Shaping' },
  { id: 'unit', label: 'Unit Costs' },
  { id: 'alerts', label: 'Alert History' },
];

export function DetailPanel() {
  const workloads = useStore((s) => s.workloads);
  const budgets = useStore((s) => s.budgets);
  const models = useStore((s) => s.models);
  const selectedId = useStore((s) => s.selectedId);
  const activeTab = useStore((s) => s.activeTab);
  const setTab = useStore((s) => s.setTab);
  const now = useStore((s) => s.now);

  const workload = workloads.find((w) => w.id === selectedId);
  const budget = budgets.find((b) => b.workload_id === selectedId);

  if (!workload || !budget) {
    return (
      <main className="flex flex-1 items-center justify-center text-sm text-dim">
        Select a workload to view its budget, models, and governance.
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col overflow-hidden bg-deep">
      <div className="border-b border-edge px-6 pt-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-txt">{workload.name}</h2>
            <div className="mt-0.5 font-mono text-xs text-sub">
              {workload.model} · {PROVIDER_LABEL[workload.model_provider]} · {workload.team} ·{' '}
              {workload.environment}
            </div>
          </div>
          <div className="text-right">
            <div
              className="font-mono text-lg font-bold"
              style={{ color: ratioColor(workload.value.value_ratio) }}
            >
              {formatRatio(workload.value.value_ratio)} return
            </div>
            <div className="font-mono text-xs text-sub">
              {formatInt(workload.outputs.daily_inferences)} calls/day
            </div>
          </div>
        </div>

        <nav className="mt-4 flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
              className={`whitespace-nowrap border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-unit text-txt'
                  : 'border-transparent text-dim hover:text-sub'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        <KpiCards workload={workload} />
        {activeTab === 'budget' && (
          <BudgetProfileTab workload={workload} budget={budget} now={now} />
        )}
        {activeTab === 'models' && <MultiModelTab workload={workload} models={models} />}
        {activeTab === 'governance' && <GovernanceTab workload={workload} />}
        {activeTab === 'demand' && <DemandShapingTab workload={workload} budget={budget} />}
        {activeTab === 'unit' && <UnitCostsTab workload={workload} />}
        {activeTab === 'alerts' && <AlertHistoryTab workloadId={workload.id} />}
      </div>
    </main>
  );
}

