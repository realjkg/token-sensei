// TechnicalViewToggle (Ratio v2 Wave 2a). The single switch between the
// executive-default Initiative Dashboard (light) and the technical Mission
// Control surface (dark). Executives never need a persona selector — this is the
// one opt-in for CTOs / FinOps practitioners who want the dense drill-down.
// Procurement is treated as an executive-style reader, so it offers the same
// "into technical" affordance.
import { usePersona } from '@/lib/persona';

export function TechnicalViewToggle({ className = '' }: { className?: string }) {
  const { persona, setPersona } = usePersona();
  const inTechnical = persona === 'technical';

  const label = inTechnical ? '← Executive view' : 'Technical view →';
  const target = inTechnical ? 'executive' : 'technical';

  return (
    <button
      type="button"
      onClick={() => setPersona(target)}
      aria-label={
        inTechnical
          ? 'Switch to the executive Initiative Dashboard'
          : 'Switch to the technical Mission Control view'
      }
      className={`font-mono text-xs font-semibold tracking-wide transition-colors ${className}`}
    >
      {label}
    </button>
  );
}

