// Initiative Dashboard (Ratio v2 Wave 2a). The executive-default surface — light
// theme, board title from the language map, a Spend Summary strip, and a grid of
// Initiative Cards. It reads the same engine numbers as the technical Mission
// Board; only the lens (vocabulary + visual hierarchy) differs. A "Technical
// view →" toggle in the header lets CTOs / FinOps opt into the dark surface.
import { useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { useLanguage } from '@/lib/languageMap';
import { usePersona } from '@/lib/persona';
import { TechnicalViewToggle } from '@/components/TechnicalViewToggle';
import { buildInitiativeBoard } from './initiativeModel';
import { InitiativeCard } from './InitiativeCard';
import { SpendSummaryBar } from './SpendSummaryBar';

export function InitiativeDashboard() {
  const workloads = useStore((s) => s.workloads);
  const lang = useLanguage();
  const { persona } = usePersona();
  const { initiatives, summary } = useMemo(
    () => buildInitiativeBoard(workloads),
    [workloads],
  );

  // Matrixed lens is an executive-only annotation (not procurement).
  const showLens = persona === 'executive';

  return (
    // colorScheme:light keeps native form controls / scrollbars on-theme even
    // though the document defaults to dark for the Mission Control surface.
    <div
      className="min-h-screen bg-exec-bg px-4 py-10 font-body text-exec-text"
      style={{ colorScheme: 'light' }}
    >
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-exec-text">
              {lang.boardTitle}
            </h1>
            <p className="mt-1 text-sm text-exec-muted">
              Cloud spend, value, and approvals across the AI initiative portfolio.
            </p>
          </div>
          <TechnicalViewToggle className="rounded-full border border-exec-border bg-exec-surface px-4 py-2 text-gate shadow-sm hover:bg-exec-bg" />
        </header>

        <SpendSummaryBar summary={summary} />

        <main aria-label={lang.boardTitle}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {initiatives.map((initiative) => (
              <InitiativeCard
                key={initiative.id}
                initiative={initiative}
                lang={lang}
                showLens={showLens}
              />
            ))}
          </div>
        </main>

        <a href="/" className="block text-center text-xs text-exec-muted hover:text-exec-text">
          ← back to Ratio
        </a>
      </div>
    </div>
  );
}

