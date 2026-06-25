// Ratio — 3-panel app shell (spec §3.1). Header on top, workload list / detail /
// agent across the middle, alert ticker in the footer.

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { WorkloadList } from '@/components/workload/WorkloadList';
import { DetailPanel } from '@/components/detail/DetailPanel';
import { AgentPanel } from '@/components/agent/AgentPanel';

export default function App() {
  return (
    <div className="flex h-full flex-col bg-void font-body text-txt">
      <Header />
      <div className="flex min-h-0 flex-1">
        <WorkloadList />
        <DetailPanel />
        <AgentPanel />
      </div>
      <Footer />
    </div>
  );
}

