// Connectors — placeholder (Wave 4 Slice 1).
// Cloud cost-API connector management lives here in a future slice.
import { NavBar } from '@/components/layout/NavBar';

export default function Connectors() {
  return (
    <div className="flex h-screen flex-col bg-void font-body text-txt">
      <NavBar active="connectors" />
      <main className="flex flex-1 flex-col items-center justify-center gap-2">
        <p className="font-mono text-xs uppercase tracking-widest text-dim">Coming soon</p>
        <h1 className="font-mono text-xl font-bold text-txt">Connectors</h1>
        <p className="text-sm text-sub">Cloud cost-API and attribution source connectors.</p>
      </main>
    </div>
  );
}

