// FindingsPage — Wave 4 Slice 1 home screen.
// Ranked findings queue (worst value-ratio first) on the left;
// recommendation pane for the selected finding on the right.
// Verbs: Select (click a row) / Apply (increments captured tally) / Dismiss.
// No badges, confetti, streaks — quiet captured count only.

import { useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import { buildFindings, type FindingView } from './findingsModel';
import { ValueRatioMeter } from './ValueRatioMeter';
import { NavBar } from '@/components/layout/NavBar';
import { SpendToValueGraph } from './SpendToValueGraph';
import { formatUSD, formatRatio } from '@/lib/format';
import { TOKEN_HEX } from '@/lib/scales';
import type { Workload } from '@/types';

export function FindingsPage() {
  const workloads = useStore((s) => s.workloads);
  const findings = useMemo(() => buildFindings(workloads), [workloads]);

  // Auto-select the worst finding on first render.
  const [selectedId, setSelectedId] = useState<string | null>(
    () => findings[0]?.workloadId ?? null,
  );
  const [capturedCount, setCapturedCount] = useState(0);
  const [dismissedIds, setDismissedIds] = useState<ReadonlySet<string>>(new Set());

  const visible = findings.filter((f) => !dismissedIds.has(f.workloadId));
  const selected = visible.find((f) => f.workloadId === selectedId) ?? visible[0] ?? null;

  function handleSelect(id: string) {
    setSelectedId(id);
  }

  function handleApply() {
    setCapturedCount((n) => n + 1);
  }

  function handleDismiss(id: string) {
    setDismissedIds((prev) => new Set([...prev, id]));
    // Advance selection to the next visible finding.
    const idx = visible.findIndex((f) => f.workloadId === id);
    const next = visible[idx + 1] ?? visible[idx - 1] ?? null;
    setSelectedId(next?.workloadId ?? null);
  }

  return (
    <div className="flex h-screen flex-col bg-void font-body text-txt">
      <NavBar active="findings" />

      {/* Page header */}
      <header className="shrink-0 border-b border-edge bg-deep px-6 py-4">
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="font-mono text-lg font-bold text-txt">Findings</h1>
            <p className="mt-0.5 text-xs text-sub">
              Workloads ranked by value ratio — worst first. Below the 3× value minimum.
            </p>
          </div>
          {capturedCount > 0 && (
            <span className="font-mono text-xs text-dim">
              {capturedCount} action{capturedCount !== 1 ? 's' : ''} captured
            </span>
          )}
        </div>
      </header>

      {/* Two-pane content */}
      <div className="flex min-h-0 flex-1">
        {/* Left: ranked findings list */}
        <aside
          className="w-72 shrink-0 overflow-y-auto border-r border-edge lg:w-80"
          aria-label="Findings list"
        >
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <p className="font-mono text-sm text-dim">All findings dismissed</p>
            </div>
          ) : (
            visible.map((f, idx) => (
              <FindingRow
                key={f.workloadId}
                finding={f}
                rank={idx + 1}
                isSelected={f.workloadId === selected?.workloadId}
                onSelect={() => handleSelect(f.workloadId)}
              />
            ))
          )}
        </aside>

        {/* Right: recommendation pane */}
        <main className="flex-1 overflow-y-auto" aria-label="Recommendation">
          {selected ? (
            <RecommendationPane
              finding={selected}
              allWorkloads={workloads}
              onApply={handleApply}
              onDismiss={() => handleDismiss(selected.workloadId)}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="font-mono text-sm text-dim">Select a finding to view the recommendation</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FindingRow — compact list item
// ---------------------------------------------------------------------------

function FindingRow({
  finding,
  rank,
  isSelected,
  onSelect,
}: {
  finding: FindingView;
  rank: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full border-b border-edge px-4 py-3 text-left transition-colors ${
        isSelected ? 'bg-raised' : 'hover:bg-raised/40'
      }`}
      aria-pressed={isSelected}
      aria-label={`Finding ${rank}: ${finding.workloadName}`}
    >
      <div className="flex items-start gap-2.5">
        {/* Rank */}
        <span className="mt-0.5 shrink-0 font-mono text-[10px] text-dim w-4 text-right">
          {rank}
        </span>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-body text-sm font-medium text-txt">
              {finding.workloadName}
            </span>
            {/* Evidence: ratio + spend */}
            <div className="flex shrink-0 items-center gap-2">
              <span
                className="font-mono text-xs font-bold"
                style={{ color: finding.valueColor }}
              >
                {formatRatio(finding.valueRatio)}
              </span>
              <span className="font-mono text-[11px] text-dim">
                {formatUSD(finding.monthlySpend, { compact: true })}/mo
              </span>
            </div>
          </div>

          {/* Inline meter — quiet */}
          <ValueRatioMeter ratio={finding.valueRatio} size="inline" />
        </div>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// RecommendationPane — enlarged detail for the selected finding
// ---------------------------------------------------------------------------

function RecommendationPane({
  finding,
  allWorkloads,
  onApply,
  onDismiss,
}: {
  finding: FindingView;
  allWorkloads: Workload[];
  onApply: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl space-y-6 px-8 py-8">
      {/* Workload name */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-wider text-dim">Finding</p>
        <h2 className="mt-1 font-body text-xl font-semibold text-txt">{finding.workloadName}</h2>
        <p className="mt-1 text-sm text-sub">{finding.problem}</p>
      </div>

      {/* Value-ratio meter — enlarged */}
      <ValueRatioMeter ratio={finding.valueRatio} size="large" />

      {/* Evidence: two values */}
      <section aria-label="Evidence">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-dim">Evidence</p>
        <div className="grid grid-cols-2 gap-3">
          <EvidenceCell
            label="Current ratio"
            value={formatRatio(finding.valueRatio)}
            color={finding.valueColor}
            bold
          />
          <EvidenceCell
            label="Monthly spend"
            value={formatUSD(finding.monthlySpend)}
            color={TOKEN_HEX.cost}
          />
        </div>
        {/* Spend-to-value graph — shows where this workload sits in the portfolio */}
        <div className="mt-4 rounded-md border border-edge bg-slab p-3">
          <p className="mb-3 font-mono text-[9px] uppercase tracking-wider text-dim">
            Portfolio context — spend vs. value
          </p>
          <SpendToValueGraph
            workloads={allWorkloads}
            selectedWorkloadId={finding.workloadId}
            size="large"
          />
        </div>
      </section>

      {/* Recommended action */}
      <section aria-label="Recommended action">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-dim">
          Recommended action
        </p>
        <p className="text-sm text-txt">{finding.recommendedAction}</p>
      </section>

      {/* Projected impact — hero figure */}
      <section aria-label="Projected monthly impact">
        <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-dim">
          Projected monthly impact
        </p>
        {finding.projectedMonthlyImpact > 0 ? (
          <span
            className="font-mono text-3xl font-bold"
            style={{ color: TOKEN_HEX.value }}
          >
            {formatUSD(finding.projectedMonthlyImpact)}
          </span>
        ) : (
          <span className="font-mono text-lg text-dim">No estimate — monitor</span>
        )}
      </section>

      {/* Verbs: Apply / Dismiss — no badges, no confetti */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={onApply}
          className="rounded-md px-4 py-2 font-mono text-sm font-bold transition-colors hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-shape/60"
          style={{
            background: TOKEN_HEX.shape,
            color: '#05070b', // void — high contrast on the amber
          }}
        >
          Apply
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md border border-edge px-4 py-2 font-mono text-sm text-sub transition-colors hover:border-sub hover:text-txt focus:outline-none focus-visible:ring-2 focus-visible:ring-edge"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

function EvidenceCell({
  label,
  value,
  color,
  bold = false,
}: {
  label: string;
  value: string;
  color: string;
  bold?: boolean;
}) {
  return (
    <div className="rounded-md border border-edge bg-slab p-3">
      <p className="font-mono text-[10px] text-dim">{label}</p>
      <p
        className={`mt-1 font-mono text-base ${bold ? 'font-bold' : ''}`}
        style={{ color }}
      >
        {value}
      </p>
    </div>
  );
}

