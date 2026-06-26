// Mission Detail (Ratio v2 Workstream 1, Layer 2) — the drill-down behind a
// mission card. Progressive disclosure: this carries the FULL v1 engine depth,
// re-presented as mission sections. The six v1 detail tabs are reused verbatim
// in capability (relabeled, not reduced), so a practitioner loses nothing while
// a newcomer is never forced to see it. No engine changes — values are identical
// to the v1 detail panel. Renders fully offline on mock data. Status-pulse /
// Lottie motion and the full a11y pass are PR C; this is the structural view.
import { useState } from 'react';
import { useStore, type DetailTab } from '@/store/useStore';
import { formatInt, formatRatio } from '@/lib/format';
import { PROVIDER_LABEL, ratioColor, TOKEN_HEX } from '@/lib/scales';
import { KpiCards } from '@/components/detail/KpiCards';
import { BudgetProfileTab } from '@/components/detail/BudgetProfileTab';
import { MultiModelTab } from '@/components/detail/MultiModelTab';
import { GovernanceTab } from '@/components/detail/GovernanceTab';
import { DemandShapingTab } from '@/components/detail/DemandShapingTab';
import { UnitCostsTab } from '@/components/detail/UnitCostsTab';
import { AlertHistoryTab } from '@/components/detail/AlertHistoryTab';
import { toMissionView, type MissionStatus } from './missionModel';

// Mission sections map 1:1 onto the six v1 detail tabs (spec §3.4 → Workstream 1
// mapping table). `tab` is the underlying v1 DetailTab id; `label` is the mission
// re-labeling; `v1` names the capability it carries so the lineage is explicit.
interface MissionSection {
  tab: DetailTab;
  label: string;
  v1: string;
}

const SECTIONS: MissionSection[] = [
  { tab: 'budget', label: 'Fuel & Trajectory', v1: 'Budget Profile' },
  { tab: 'models', label: 'Engine Options', v1: 'Multi-Model' },
  { tab: 'governance', label: 'Mission Readiness', v1: 'Governance Gates' },
  { tab: 'demand', label: 'Flight Plan', v1: 'Demand Shaping' },
  { tab: 'unit', label: 'Mission Economics', v1: 'Unit Costs' },
  { tab: 'alerts', label: 'Mission Log', v1: 'Alert History' },
];

const STATUS_META: Record<MissionStatus, { label: string; color: string }> = {
  nominal: { label: 'NOMINAL', color: TOKEN_HEX.value },
  caution: { label: 'CAUTION', color: TOKEN_HEX.shape },
  critical: { label: 'CRITICAL', color: TOKEN_HEX.cost },
};

interface MissionDetailProps {
  missionId: string;
  // Back affordance to the Mission Board (Layer 1).
  onBack: () => void;
}

export function MissionDetail({ missionId, onBack }: MissionDetailProps) {
  const workloads = useStore((s) => s.workloads);
  const budgets = useStore((s) => s.budgets);
  const models = useStore((s) => s.models);
  const now = useStore((s) => s.now);

  // Each mission detail keeps its own open section, defaulting to Fuel &
  // Trajectory (the spec's default drill-down section).
  const [section, setSection] = useState<DetailTab>('budget');

  const workload = workloads.find((w) => w.id === missionId);
  const budget = budgets.find((b) => b.workload_id === missionId);

  if (!workload || !budget) {
    return (
      <div className="min-h-screen bg-void px-4 py-10 font-body text-txt">
        <div className="mx-auto max-w-5xl space-y-6">
          <BackToFleet onBack={onBack} />
          <p className="text-sm text-dim">Mission not found.</p>
        </div>
      </div>
    );
  }

  // Reuse the board view-model so the detail header reads the SAME status and
  // value the card showed — no divergent copy of the truth.
  const view = toMissionView(workload);
  const meta = STATUS_META[view.status];
  const activeSection = SECTIONS.find((s) => s.tab === section);

  return (
    <div className="min-h-screen bg-void px-4 py-10 font-body text-txt">
      <div className="mx-auto max-w-5xl space-y-6">
        <BackToFleet onBack={onBack} />

        {/* Mission header — R4: the value badge rides in the header so no cost
            section ever appears without its value context. */}
        <header className="rounded-2xl border border-edge bg-slab p-6" style={{ borderTop: `3px solid ${meta.color}` }}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-body text-2xl font-semibold tracking-tight text-txt">
                {workload.name}
              </h1>
              <p className="mt-1 font-mono text-xs text-sub">
                {workload.model} · {PROVIDER_LABEL[workload.model_provider]} · {workload.team} ·{' '}
                {workload.environment}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span
                  className="rounded-full px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest"
                  style={{ color: meta.color, backgroundColor: `${meta.color}1a` }}
                >
                  {meta.label}
                </span>
                {view.alertCount > 0 && (
                  <span className="font-mono text-[10px] text-sub">
                    {view.alertCount} active {view.alertCount === 1 ? 'warning' : 'warnings'}
                  </span>
                )}
              </div>
            </div>

            {/* Value badge (R4 — the denominator) */}
            <div className="text-right">
              <div
                className="font-mono text-2xl font-bold"
                style={{ color: ratioColor(workload.value.value_ratio) }}
              >
                {formatRatio(workload.value.value_ratio)} return
              </div>
              <div className="mt-0.5 font-mono text-xs text-sub">
                {formatInt(workload.outputs.daily_inferences)} calls/day
              </div>
            </div>
          </div>
        </header>

        {/* Section nav — the six mission sections, each a full v1 capability. */}
        <nav aria-label="Mission sections" className="flex flex-wrap gap-2">
          {SECTIONS.map((s) => {
            const active = section === s.tab;
            return (
              <button
                key={s.tab}
                type="button"
                onClick={() => setSection(s.tab)}
                aria-current={active ? 'true' : undefined}
                className={`rounded-full border px-3 py-1.5 font-mono text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gate ${
                  active
                    ? 'border-gate bg-raised text-txt'
                    : 'border-edge text-dim hover:text-sub'
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </nav>

        {/* Active section body — the unchanged v1 tab, full depth. KpiCards rides
            above every section exactly as in the v1 detail panel (R4: value
            anchors the KPI row). */}
        <section
          aria-label={activeSection?.label}
          className="space-y-5 rounded-2xl border border-edge bg-deep p-6"
        >
          {/* Lineage caption — each mission section IS a full v1 capability. */}
          {activeSection && (
            <p className="font-mono text-[10px] uppercase tracking-wider text-dim">
              {activeSection.label} · carries v1 {activeSection.v1}
            </p>
          )}
          <KpiCards workload={workload} />
          {section === 'budget' && (
            <BudgetProfileTab workload={workload} budget={budget} now={now} />
          )}
          {section === 'models' && <MultiModelTab workload={workload} models={models} />}
          {section === 'governance' && <GovernanceTab workload={workload} />}
          {section === 'demand' && <DemandShapingTab workload={workload} budget={budget} />}
          {section === 'unit' && <UnitCostsTab workload={workload} />}
          {section === 'alerts' && <AlertHistoryTab workloadId={workload.id} />}
        </section>
      </div>
    </div>
  );
}

function BackToFleet({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center gap-1.5 font-mono text-xs text-sub transition-colors hover:text-txt focus:outline-none focus-visible:ring-2 focus-visible:ring-gate"
    >
      <span aria-hidden>←</span> Fleet
    </button>
  );
}

