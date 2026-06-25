// Four governance gate dots — spec §3.3. Filled = passed, hollow = pending.

import type { Workload } from '@/types';

const GATES: Array<{ key: keyof Workload['governance']; label: string }> = [
  { key: 'policy_check', label: 'Policy' },
  { key: 'ethics_review', label: 'Ethics' },
  { key: 'cost_approval', label: 'Cost' },
  { key: 'scale_authorized', label: 'Scale' },
];

export function GateDots({ governance }: { governance: Workload['governance'] }) {
  return (
    <div className="flex items-center gap-1" title="Governance gates: Policy / Ethics / Cost / Scale">
      {GATES.map((gate) => {
        const passed = governance[gate.key];
        return (
          <span
            key={gate.key}
            aria-label={`${gate.label} ${passed ? 'passed' : 'pending'}`}
            className="h-2 w-2 rounded-full border"
            style={{
              background: passed ? 'var(--gate)' : 'transparent',
              borderColor: passed ? 'var(--gate)' : 'var(--dim)',
            }}
          />
        );
      })}
    </div>
  );
}

