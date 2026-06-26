# Codebase Map

| Directory | Purpose |
|---|---|
| `src` | React 18 + TypeScript application source for the Ratio FinOps UI. |
| `src/agent` | AgentClient seam, data-grounded mock responder, and optional live Claude client. |
| `src/components` | UI components for the 3-panel layout, workload list, detail tabs, and agent chat. |
| `src/data` | Deterministic JSON/TypeScript seed data for workloads, models, budgets, and alerts. |
| `src/lib` | Pure calculation helpers for forecasts, budget status, model comparison, demand shaping, formatting, and scales. |
| `src/store` | Zustand state store for selected workload, filters, thresholds, gates, demand shaping, and chat messages. |
| `src/types` | TypeScript data model definitions for workloads, models, budgets, alerts, and agent queries. |
