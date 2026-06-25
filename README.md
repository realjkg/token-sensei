# Ratio

**AI-native FinOps for AI workloads.** Ratio governs *value ratios* — the return
on every inference dollar — not just raw cost. It pairs every cost with its value
context, forecasts daily and monthly spend, compares model costs, enforces
governance gates before scale, and answers cost questions through a data-grounded
agent.

This repository is **Phase 1**: a runnable, demo-ready React frontend driven by
seed data, implementing the core acceptance criteria of the Ratio design spec.

## Quick start

```bash
npm install
npm run dev      # serves the 3-panel Ratio UI on http://localhost:5173
```

```bash
npm run build    # production build (Vite)
npm run lint     # ESLint
npm run typecheck # tsc --noEmit (also enforced in CI)
```

No backend, no API keys, no auth are required to run the app.

## Stack

- **React 18 + TypeScript + Vite**
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

```
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

### The agent seam

The agent is behind a clean `AgentClient` interface (`src/agent/`). With no key
set, a **data-grounded `MockAgentClient`** computes real answers from the seed
data — every cost cited with its value ratio (spec §7.1). Setting
`VITE_ANTHROPIC_API_KEY` swaps in `LiveAgentClient`, which calls Claude with a
system prompt rebuilt from current workload state. **The app runs fully without a
key.**

## Deferred to later waves

These need live services or secrets and are out of Phase 1 scope:

- Live Claude wiring is built but inactive until `VITE_ANTHROPIC_API_KEY` is set
- The standalone REST API engine + webhooks (spec §14, acceptance items 9–10)
- Slack/email report delivery (§9)
- Cloud cost connectors — Azure / AWS (§12 Sprint 4)
- Auth + team scoping (§11 Sprint 3+)

See `docs/ratio-design-spec.md` for the full specification.

