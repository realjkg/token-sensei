// Mission Board (Ratio v2 Workstream 1, Layer 1) — the simple-by-default surface.
// Renders every workload as a mission card over the unchanged v1 engine, fully
// offline on mock seed data. Mission Detail drill-down and the full motion/a11y
// pass are later PRs (B and C).
import { useMemo } from 'react';
import { FleetHeader } from './FleetHeader';
import { MissionCard } from './MissionCard';
import { buildMissionBoard } from './missionModel';

export function MissionBoard() {
  const { missions, fleet } = useMemo(() => buildMissionBoard(), []);

  return (
    <div className="min-h-screen bg-void px-4 py-10 font-body text-txt">
      <div className="mx-auto max-w-6xl space-y-8">
        <FleetHeader fleet={fleet} />

        <main aria-label="Mission board">
          <h2 className="sr-only">Missions</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {missions.map((mission) => (
              <MissionCard key={mission.id} mission={mission} />
            ))}
          </div>
        </main>

        <a href="/" className="block text-center text-xs text-dim hover:text-sub">
          ← back to Ratio
        </a>
      </div>
    </div>
  );
}

