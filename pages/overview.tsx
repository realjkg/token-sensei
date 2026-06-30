// Overview route — the executive Initiative Dashboard demoted from home
// (Wave 4 Slice 1). Content is unchanged; just served at /overview now.
import { NavBar } from '@/components/layout/NavBar';
import { MissionSurface } from '@/executive/MissionSurface';

export default function Overview() {
  return (
    <div className="flex h-screen flex-col">
      <NavBar active="overview" />
      {/* MissionSurface owns its own header + theme; rendered below the nav. */}
      <div className="min-h-0 flex-1 overflow-auto">
        <MissionSurface />
      </div>
    </div>
  );
}

