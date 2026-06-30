// SpendToValueGraph — Wave 4 Slice 2 signature component.
// Scatter plot: monthly spend (x) vs. value ratio (y).
// Reference lines at 1× break-even and 3× minimum threshold.
// Points colored by the existing value-ratio scale; the selected workload is
// emphasized against the portfolio cloud. Inline SVG — no charting dependency.
// Two sizes mirroring the ValueRatioMeter: 'compact' and 'large'.

import { ratioColor } from '@/lib/scales';
import { formatUSD } from '@/lib/format';
import { VALUE_MINIMUM } from './findingsModel';
import type { Workload } from '@/types';

// Y-axis ceiling — matches ValueRatioMeter's CEILING constant.
const CEILING = 10;

// Design-token hex values (from obvious.md §Design Tokens).
const C_EDGE = '#1a2235';
const C_SUB  = '#8895ad';
const C_DIM  = '#4d5a72';

interface SpendToValueGraphProps {
  workloads: Workload[];
  /** Highlighted workload ID — the finding under review. Omit for portfolio view. */
  selectedWorkloadId?: string | null;
  size?: 'compact' | 'large';
}

export function SpendToValueGraph({
  workloads,
  selectedWorkloadId = null,
  size = 'large',
}: SpendToValueGraphProps) {
  const isLarge = size === 'large';

  // ── SVG viewport ─────────────────────────────────────────────────────────
  const VW = 480;
  const VH = isLarge ? 230 : 100;
  const M = isLarge
    ? { top: 16, right: 90, bottom: 36, left: 44 }
    : { top: 8,  right: 8,  bottom: 8,  left: 8  };
  const PW = VW - M.left - M.right; // plot width
  const PH = VH - M.top  - M.bottom; // plot height

  // ── Scales ───────────────────────────────────────────────────────────────
  const maxSpend = workloads.length > 0
    ? Math.max(...workloads.map((w) => w.costs.monthly_spend))
    : 1000;
  // 15% right-padding so the rightmost point isn't flush to the axis edge.
  const xMax = maxSpend * 1.15;

  function xFor(spend: number): number {
    return M.left + (spend / xMax) * PW;
  }
  function yFor(ratio: number): number {
    return M.top + PH - (Math.max(0, Math.min(ratio, CEILING)) / CEILING) * PH;
  }

  // ── Reference line Y positions ───────────────────────────────────────────
  const yBreakEven = yFor(1.0);
  const yMinThresh  = yFor(VALUE_MINIMUM); // 3×

  // ── Axis tick values ─────────────────────────────────────────────────────
  const yTickValues = isLarge ? [0, 1, 3, 5, 10] : [];
  // Three x ticks: $0, half of max spend, max spend.
  const xTickValues: number[] = isLarge ? [0, maxSpend / 2, maxSpend] : [];

  return (
    <figure
      className="w-full"
      aria-label="Spend-to-value portfolio scatter — workloads by monthly spend vs. value ratio"
    >
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        width="100%"
        aria-hidden="true"
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* ── Reference lines ─────────────────────────────────────────── */}

        {/* 1× break-even — the point where spend = value returned */}
        <line
          x1={M.left} y1={yBreakEven}
          x2={M.left + PW} y2={yBreakEven}
          stroke={C_SUB} strokeWidth={0.75} strokeDasharray="3 4" opacity={0.55}
        />
        {isLarge && (
          <text
            x={M.left + PW + 6} y={yBreakEven + 3.5}
            fontSize={9} fill={C_SUB}
            fontFamily="'JetBrains Mono', monospace"
          >
            1× break-even
          </text>
        )}

        {/* 3× minimum threshold — Gate 3 floor */}
        <line
          x1={M.left} y1={yMinThresh}
          x2={M.left + PW} y2={yMinThresh}
          stroke={C_DIM} strokeWidth={0.75} strokeDasharray="3 4" opacity={0.65}
        />
        {isLarge && (
          <text
            x={M.left + PW + 6} y={yMinThresh + 3.5}
            fontSize={9} fill={C_DIM}
            fontFamily="'JetBrains Mono', monospace"
          >
            3× min
          </text>
        )}

        {/* ── Axes (large only) ────────────────────────────────────────── */}
        {isLarge && (
          <>
            {/* Y axis line */}
            <line
              x1={M.left} y1={M.top}
              x2={M.left} y2={M.top + PH}
              stroke={C_EDGE} strokeWidth={1}
            />
            {/* X axis line */}
            <line
              x1={M.left}      y1={M.top + PH}
              x2={M.left + PW} y2={M.top + PH}
              stroke={C_EDGE} strokeWidth={1}
            />

            {/* Y ticks + labels */}
            {yTickValues.map((v) => (
              <g key={v}>
                <line
                  x1={M.left - 3} y1={yFor(v)}
                  x2={M.left}     y2={yFor(v)}
                  stroke={C_EDGE} strokeWidth={1}
                />
                <text
                  x={M.left - 5} y={yFor(v) + 3.5}
                  textAnchor="end" fontSize={9} fill={C_DIM}
                  fontFamily="'JetBrains Mono', monospace"
                >
                  {v}×
                </text>
              </g>
            ))}

            {/* X ticks + labels */}
            {xTickValues.map((v, i) => (
              <g key={i}>
                <line
                  x1={xFor(v)} y1={M.top + PH}
                  x2={xFor(v)} y2={M.top + PH + 3}
                  stroke={C_EDGE} strokeWidth={1}
                />
                <text
                  x={xFor(v)} y={M.top + PH + 14}
                  textAnchor="middle" fontSize={9} fill={C_DIM}
                  fontFamily="'JetBrains Mono', monospace"
                >
                  {formatUSD(v, { compact: true })}
                </text>
              </g>
            ))}

            {/* Y axis label — rotated */}
            <text
              x={M.left - 34}
              y={M.top + PH / 2}
              textAnchor="middle" fontSize={9} fill={C_DIM}
              fontFamily="'JetBrains Mono', monospace"
              transform={`rotate(-90, ${M.left - 34}, ${M.top + PH / 2})`}
            >
              value ratio
            </text>

            {/* X axis label */}
            <text
              x={M.left + PW / 2}
              y={VH - 2}
              textAnchor="middle" fontSize={9} fill={C_DIM}
              fontFamily="'JetBrains Mono', monospace"
            >
              monthly spend
            </text>
          </>
        )}

        {/* ── Data points ─────────────────────────────────────────────── */}
        {workloads.map((w) => {
          const cx = xFor(w.costs.monthly_spend);
          const cy = yFor(w.value.value_ratio);
          const color = ratioColor(w.value.value_ratio);
          const isSelected = w.id === selectedWorkloadId;
          // Below break-even: where value fails to come back.
          const isBelowBreakEven = w.value.value_ratio < 1.0;
          const r = isSelected ? 7 : 5;

          // Flip label to left if the point is in the right half of the plot.
          const nearRightEdge = cx > M.left + PW / 2;
          const labelX = nearRightEdge ? cx - r - 4 : cx + r + 5;
          const labelAnchor = nearRightEdge ? 'end' : 'start';
          const shortName = w.name.length > 18
            ? `${w.name.slice(0, 17)}\u2026`
            : w.name;

          return (
            <g key={w.id}>
              {/* Below-break-even: quiet outer ring — visual emphasis without noise */}
              {isBelowBreakEven && (
                <circle
                  cx={cx} cy={cy}
                  r={r + 5}
                  fill="none"
                  stroke={color}
                  strokeWidth={1}
                  opacity={0.25}
                />
              )}
              {/* Selected workload: accent ring — locates this finding in the cloud */}
              {isSelected && (
                <circle
                  cx={cx} cy={cy}
                  r={r + 4}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.5}
                  opacity={0.6}
                  className="motion-safe:transition-all motion-safe:duration-300"
                />
              )}
              {/* Main point */}
              <circle
                cx={cx} cy={cy}
                r={r}
                fill={color}
                opacity={isSelected ? 1.0 : 0.6}
                className="motion-safe:transition-all motion-safe:duration-300"
              />
              {/* Name label — large variant, selected point only */}
              {isLarge && isSelected && (
                <text
                  x={labelX}
                  y={cy + 3.5}
                  textAnchor={labelAnchor}
                  fontSize={10}
                  fill={color}
                  fontFamily="'JetBrains Mono', monospace"
                  fontWeight="bold"
                >
                  {shortName}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

