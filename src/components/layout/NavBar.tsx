// Top-level navigation for the six Ratio objects (Wave 4 Slice 1).
// Thin, hairline bar — does not compete with page content.

const NAV_ITEMS = [
  { key: 'findings',   label: 'Findings',   href: '/' },
  { key: 'overview',   label: 'Overview',   href: '/overview' },
  { key: 'workloads',  label: 'Workloads',  href: '/workloads' },
  { key: 'connectors', label: 'Connectors', href: '/connectors' },
  { key: 'frameworks', label: 'Frameworks', href: '/frameworks' },
  { key: 'reports',    label: 'Reports',    href: '/reports' },
] as const;

type NavKey = (typeof NAV_ITEMS)[number]['key'];

export function NavBar({ active }: { active?: NavKey }) {
  return (
    <nav
      className="flex h-10 shrink-0 items-center gap-0.5 border-b border-edge bg-deep px-3"
      aria-label="Main navigation"
    >
      {/* Logo mark */}
      <span className="mr-4 flex items-center gap-1.5">
        <span
          className="flex h-5 w-5 items-center justify-center rounded font-mono text-xs font-bold"
          style={{ background: 'var(--gate)' }}
          aria-hidden="true"
        >
          <span className="text-white">%</span>
        </span>
        <span className="font-mono text-sm font-bold tracking-tight text-txt">Ratio</span>
      </span>

      {NAV_ITEMS.map((item) => {
        const isActive = item.key === active;
        return (
          <a
            key={item.key}
            href={item.href}
            className={`rounded px-2.5 py-1 font-mono text-xs transition-colors ${
              isActive
                ? 'bg-raised text-txt'
                : 'text-sub hover:bg-raised/60 hover:text-txt'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}

