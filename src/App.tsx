// Ratio — 3-panel app shell (spec §3.1). Header on top, workload list / detail /
// agent across the middle, alert ticker in the footer.
//
// Minimal path-based switch: /hello renders the hello-world seam demo;
// every other path falls through to the main app. No router dependency.

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { WorkloadList } from '@/components/workload/WorkloadList';
import { DetailPanel } from '@/components/detail/DetailPanel';
import { AgentPanel } from '@/components/agent/AgentPanel';
import { HelloPage } from '@/hello/HelloPage';

export default function App() {
  if (window.location.pathname === '/hello') {
    return <HelloPage />;
  }

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

