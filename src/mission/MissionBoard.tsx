// Mission Board (Ratio v2 Workstream 1, Layer 1) — the simple-by-default surface.
// Renders every workload as a mission card over the unchanged v1 engine, fully
// offline on mock seed data. Tapping a mission opens Mission Detail (Layer 2,
// this PR). The full motion/Lottie + accessibility pass is PR C.
import { useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import { FleetHeader } from './FleetHeader';
import { MissionCard } from './MissionCard';
import { MissionDetail } from './MissionDetail';
import { buildMissionBoard } from './missionModel';

export function MissionBoard() {
  // Read workloads from the store so Mission Detail edits (demand shape, gates)
  // stay consistent with the board view-model — one source of truth.
  const workloads = useStore((s) => s.workloads);
  const [openMissionId, setOpenMissionId] = useState<string | null>(null);
  const { missions, fleet } = useMemo(() => buildMissionBoard(workloads), [workloads]);

  // Layer 2 — drill into a mission, with a back affordance to the fleet.
  if (openMissionId) {
    return <MissionDetail missionId={openMissionId} onBack={() => setOpenMissionId(null)} />;
  }

  return (
    <div className="min-h-screen bg-void px-4 py-10 font-body text-txt">
      <div className="mx-auto max-w-6xl space-y-8">
        <FleetHeader fleet={fleet} />

        <main aria-label="Mission board">
          <h2 className="sr-only">Missions</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {missions.map((mission) => (
              <MissionCard
                key={mission.id}
                mission={mission}
                onOpen={() => setOpenMissionId(mission.id)}
              />
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

