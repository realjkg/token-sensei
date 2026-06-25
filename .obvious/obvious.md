# Obvious Repo Guide

Version: autobuild-setup-worker v1.2.0

## Codebase Map

See `.obvious/codebase-map.md`.

## Repo Guidance

- This repo is `realjkg/token-sensei`, a Vite/React frontend for Ratio, an AI-native FinOps platform.
- Use npm, not pnpm/yarn/bun, because `package-lock.json` is present and `npm install` was verified.
- Do not run the full `typecheck` script in this sandbox; it exists as `npm run typecheck` (`tsc --noEmit`) and CI can run it.
- No backend, auth, database, Docker service, or required secret is needed for local development.
- `VITE_ANTHROPIC_API_KEY` is optional. Without it, the app uses the data-grounded mock agent and remains fully runnable.
- Keep app code changes scoped under `src/` unless build tooling or docs need updates. Do not commit generated `dist/` or `.obvious-install/` evidence files.
- the design specs are point-in-time, session-based documents and should be kept as ephemeral artifacts in obvious.

## Local Verification

<!-- local-verification-summary:v1 -->
- **Typecheck command:** not_discovered — script exists as `npm run typecheck`, but was intentionally not run in this sandbox per setup instructions
- **Lint command:** `npm run lint`
- **Test command:** not_discovered — no test runner or test script is configured in `package.json`
- **Scoped typecheck:** not_supported
- **Scoped lint:** `npx eslint <path>`
- **Scoped test:** not_supported
- **Full-repo check safe:** yes
- **Scoped alternatives discovered:** yes
<!-- /local-verification-summary -->

### Standard Workflow

1. Install dependencies with `npm install`.
2. Start the dev server with `npm run dev` and use the actual Vite URL from stdout. The setup run observed `http://localhost:5173/`.
3. Run `npm run lint` before committing.
4. Run `npm run build` when validating bundling or production readiness.

### Scoped Workflow

1. For linting one file or directory, run `npx eslint <path>`.

## Network Resilience Profile

This is a client-side Vite/React app. All core computation runs locally over bundled seed data.

| Surface | Network required? | Chaos monkey behaviour |
|---|---|---|
| Workload list, all detail tabs, forecast, KPI cards | No | Fully offline — pure local computation over seed data. |
| Agent panel — **mock mode** (no `VITE_ANTHROPIC_API_KEY`) | No | Fully offline — `MockAgentClient` uses only in-memory calculations. |
| Agent panel — **live mode** (`VITE_ANTHROPIC_API_KEY` set) | Yes (Anthropic API) | `sendMessage` in `useStore` wraps the call in `try/catch`. A network failure causes `fetch()` to throw; the catch block appends an inline `system` chat message (`Agent error: Failed to fetch`). No stack trace is exposed; the rest of the UI remains interactive. There is no automatic fallback to mock mode on live-mode failure — that is a known Phase 1 gap. |

**Short answer:** mock mode (the default) is fully offline and safe under any network disruption. Live mode degrades gracefully to a chat error message, not a stack trace. The Phase 1 enhancement path is to auto-fallback to `MockAgentClient` when a `LiveAgentClient` call fails.

## Sandbox Snapshot

- **Snapshot ID:** `icprr1z3f69clbt3lrls:default`
- **Captured:** 2026-06-25T18:25:27.651Z
- **Dev stack health at capture:** `dev_stack_healthy: true`
- **Primary URL verified:** `http://localhost:5173/`

## Bibliography

> **Status:** bibliography_scanned — 7 nodes upserted for `realjkg/token-sensei`.
>
> **Slugs touched:** `ratio-agent-client`, `ratio-agent-panel`, `ratio-detail-panel`, `ratio-finops-platform`, `ratio-forecast-engine`, `ratio-workload-list`, `ratio-zustand-store`.

## Security Scan

> **Note:** security_scan_not_triggered — the `trigger_security_onboarding` tool was not available in this worker toolset. Trigger manually using the target commit SHA `4e836816236ba784c76e39df2c116efe8685a867` if needed.
