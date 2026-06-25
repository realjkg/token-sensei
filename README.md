# Ratio

**AI-native FinOps for AI workloads.** Ratio governs *value ratios* — the return
on every inference dollar — not just raw cost. It pairs every cost with its value
context, forecasts daily and monthly spend, compares model costs, enforces
governance gates before scale, and answers cost questions through a data-grounded
agent.

This repository is **Phase 1**: a runnable, demo-ready app — a **React front-end +
Node.js back-end, unified in Next.js 14 (Pages Router)** — driven by seed data,
implementing the core acceptance criteria of the Ratio design spec. The front-end is
React pages and components; the back-end is Node.js API routes (`pages/api/*`) running
in the same Next.js process.

## Quick start

```bash
npm install
npm run dev      # serves the 3-panel Ratio UI on http://localhost:3000
```

```bash
npm run build    # production build (Next.js)
npm run lint     # ESLint
npm run typecheck # tsc --noEmit (also enforced in CI)
```

No external services, API keys, or auth are required to run the app — the Node.js
back-end runs in-process as Next.js API routes.

## Stack

**React front-end + Node.js back-end, unified in Next.js 14 (Pages Router).** The
front-end is React 18 pages and components (`pages/`, `src/`); the back-end is Node.js
API routes (`pages/api/*`) running in the same Next.js process — no separate server to
deploy.

- **React 18 + TypeScript** — front-end UI (pages + components)
- **Node.js API routes** (`pages/api/*`) — back-end (e.g. `pages/api/hello.ts`)
- **Next.js 14 (Pages Router)** — unifies front-end rendering and back-end routes
- **Tailwind CSS** — design tokens from the spec (§10) wired as theme colors + CSS vars
- **Zustand** — lightweight state (workloads, budgets, alerts, chat)
- **JetBrains Mono** (data/numbers) + **Instrument Sans** (prose) via `@fontsource`
- Deterministic **JSON seed data** — 7 workloads, a 7-model registry, budgets, alerts

## What's implemented (Phase 1)

The eight core acceptance criteria (spec §13) all work against seed data:

1. **Value paired with cost (R4)** — every workload, KPI, and agent answer shows the value ratio next to spend.
2. **Daily budget + live forecast** — today's budget bar with 70/90/100% thresholds, projected close, and monthly forecast with an 80% confidence interval and days-to-breach.
3. **Multi-model comparison** — what the same workload would cost on every registry model at current volume, cheaper in green / pricier in red.
4. **Thresholds** — editable soft/hard/kill percentages that drive the budget status.
5. **Governance gates (R3)** — sequential 4-gate enforcement; a gate can't pass until the prior one does, and Always-On is blocked until all four pass.
6. **Demand shaping (R2)** — six shapes, each with a projected monthly cost.
7. **Agent querying** — ask "why is my spend spiking?", "which model should I switch to?", "what's my riskiest workload?", "show today's budget status" and get specific, data-grounded answers.
8. **Unit economics (R1)** — cost per call / resolved query / active user / deflection, not cost per VM.

### Architecture

**Front-end (React) and back-end (Node.js) live in one Next.js app.** File-based
routing under `pages/` serves the React front-end; `pages/api/*` are the Node.js
back-end routes.

```
pages/
  index.tsx     Front-end: renders the 3-panel Ratio app (src/App.tsx)
  hello.tsx     Front-end: /hello reference slice (src/hello/HelloPage)
  api/
    hello.ts    Back-end: Node.js API route returning a HelloMessage (source: 'live')
src/
  types/        Data model (§2): Workload, ModelEntry, BudgetProfile, Alert, AgentQuery
  data/         Seed data: workloads, models, budgets, alerts
  lib/          Pure logic: forecast math (§6), derive, scales, budgetStatus,
                modelCompare, demandShape, format helpers
  store/        Zustand store — selection, gate sequencing, shape + threshold edits, chat
  agent/        AgentClient seam — MockAgentClient (default) + LiveAgentClient (Claude)
  components/
    layout/     Header (portfolio health) + Footer (alert ticker)
    workload/   Left panel: list, card, value-ratio bar, gate dots, filters
    detail/     Center tabs: Budget, Multi-Model, Governance, Demand, Unit, Alerts + KPI cards
    agent/      Right panel: chat + quick prompts
```

### The /hello reference flow

`/hello` is the reference front-end → back-end path. The React page `pages/hello.tsx`
renders `src/hello/HelloPage`, which talks to a typed `HelloClient` seam. The live
client fetches the Node.js back-end route `pages/api/hello.ts` (`source: 'live'`); the
mock client returns an in-memory greeting with no network. Same contract, swappable
implementation — mirroring the agent seam below.

### The agent seam

The agent is behind a clean `AgentClient` interface (`src/agent/`). With no key
set, a **data-grounded `MockAgentClient`** computes real answers from the seed
data — every cost cited with its value ratio (spec §7.1). Setting
`NEXT_PUBLIC_ANTHROPIC_API_KEY` swaps in `LiveAgentClient`, which calls Claude with a
system prompt rebuilt from current workload state. **The app runs fully without a
key.**

## Deferred to later waves

These need live services or secrets and are out of Phase 1 scope:

- Live Claude wiring is built but inactive until `NEXT_PUBLIC_ANTHROPIC_API_KEY` is set
- The standalone REST API engine + webhooks (spec §14, acceptance items 9–10)
- Slack/email report delivery (§9)
- Cloud cost connectors — Azure / AWS (§12 Sprint 4)
- Auth + team scoping (§11 Sprint 3+)

See `docs/ratio-design-spec.md` for the full specification.

