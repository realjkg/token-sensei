// Mission Surface (Ratio v2 Wave 2a). Persona-driven switch over the /mission
// route. Executives (the default) and procurement land on the light Initiative
// Dashboard; technical users (CTO / FinOps) opt into the unchanged dark Mission
// Control board. The MissionBoard component itself is untouched — the back-to-
// executive affordance is overlaid as a thin top bar so the dark surface renders
// exactly as before.
import { usePersona } from '@/lib/persona';
import { MissionBoard } from '@/mission/MissionBoard';
import { TechnicalViewToggle } from '@/components/TechnicalViewToggle';
import { InitiativeDashboard } from './InitiativeDashboard';

export function MissionSurface() {
  const { persona } = usePersona();

  if (persona === 'technical') {
    return (
      <div className="min-h-screen bg-void">
        <div className="flex justify-end border-b border-edge bg-deep px-4 py-2">
          <TechnicalViewToggle className="rounded-full border border-edge px-3 py-1 text-gate hover:bg-raised" />
        </div>
        <MissionBoard />
      </div>
    );
  }

  return <InitiativeDashboard />;
}

