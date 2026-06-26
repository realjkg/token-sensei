// CloudConnectorAdapter — the shared FOCUS-export adapter for the cloud-
// connectors MVP. One adapter serves the public-cloud trio (Azure / AWS / GCP),
// Kubernetes (OpenCost / Kubecost), and Nutanix, because all five do the same
// thing: fetch a FOCUS-formatted export from a configured endpoint and hand the
// rows to the EXISTING version-negotiation shim (`normalizeRows`, reused not
// reimplemented) up to the v1.4 canonical model. Only auth/fetch is source-
// specific — captured behind the injected `FocusExportTransport` seam.
//
// SHIPS DARK, exactly like PointFiveLiveAdapter. A default build resolves every
// connector to `disabled` (feature flag OFF) and makes ZERO network calls:
//   - healthCheck() returns an honest "not authed / ships dark" state
//   - fetchCostRows() throws a typed "not configured" error
// Even on the `configured` path the live transport is a THIN, UNWIRED SEAM in
// this MVP: the default transport factory throws a clear "not wired" error rather
// than silently inventing data. A real cloud subscription wires a concrete
// transport by injecting `transportFactory`; tests do the same with a fake.

import type {
  CostRowsResult,
  CostSourceDescriptor,
  CostWindow,
  SourceHealth,
} from './CostSourceClient';
import { CANONICAL_FOCUS_VERSION } from './focusVersions';
import type { RawSourceRow } from './focusRows';
import { normalizeRows } from './normalize';
import {
  connectorDescriptor,
  connectorStatusNote,
  resolveConnectorStatus,
  type ConnectorSpec,
  type ConnectorStatus,
} from './connectorConfig';

/**
 * The cloud-specific seam: fetch FOCUS-export rows + probe reachability. Tests
 * and (eventually) a live integration inject a concrete implementation; the
 * default build never reaches a real one.
 */
export interface FocusExportTransport {
  /** Lightweight reachability / auth probe against the export endpoint. */
  ping(): Promise<boolean>;
  /** FOCUS-shaped export rows for a window (the source's native version). */
  fetchExportRows(window: CostWindow): Promise<RawSourceRow[]>;
}

/** Factory the adapter uses to build a transport once it is configured. */
export type FocusExportTransportFactory = (
  credentials: Record<string, string>,
) => FocusExportTransport;

// Default transport: the live FOCUS-export wiring is intentionally NOT built in
// this MVP. The connectors ship dark; once a subscription exists, inject a
// concrete transport. Until then every method throws so a misconfiguration is
// loud, never a silent fabrication of cost data.
const UNWIRED_DETAIL =
  'live FOCUS-export transport not wired (MVP seam) — inject a transport to go live';

const defaultUnwiredTransportFactory: FocusExportTransportFactory = () => ({
  ping: async () => {
    throw new Error(UNWIRED_DETAIL);
  },
  fetchExportRows: async () => {
    throw new Error(UNWIRED_DETAIL);
  },
});

/** Injectable dependencies — tests override env + transport; no network in CI. */
export interface CloudConnectorAdapterDeps {
  env?: Record<string, string | undefined>;
  transportFactory?: FocusExportTransportFactory;
}

export class CloudConnectorAdapter {
  private readonly status: ConnectorStatus;
  private readonly transportFactory: FocusExportTransportFactory;

  constructor(
    private readonly spec: ConnectorSpec,
    deps: CloudConnectorAdapterDeps = {},
  ) {
    this.status = resolveConnectorStatus(spec, deps.env ?? process.env);
    this.transportFactory = deps.transportFactory ?? defaultUnwiredTransportFactory;
  }

  /** Descriptor for `listSources()` — `configured` reflects the live status. */
  describe(): CostSourceDescriptor {
    return connectorDescriptor(this.spec, this.status);
  }

  /** True only when the flag is on and all required credentials are present. */
  get isConfigured(): boolean {
    return this.status.state === 'configured';
  }

  async healthCheck(): Promise<SourceHealth> {
    const base = {
      sourceId: this.spec.id,
      sourceVersion: this.spec.focusVersion,
      canonicalVersion: CANONICAL_FOCUS_VERSION,
      checkedAt: new Date().toISOString(),
    };

    // Dark / unconfigured: honest state, no network call.
    if (this.status.state !== 'configured') {
      return {
        ...base,
        reachable: false,
        authed: false,
        detail: connectorStatusNote(this.spec, this.status),
      };
    }

    try {
      const reachable = await this.transportFactory(this.status.credentials).ping();
      return {
        ...base,
        reachable,
        authed: reachable,
        detail: reachable
          ? `${this.spec.name} reachable; FOCUS export authenticated.`
          : `${this.spec.name} did not respond to the health probe.`,
      };
    } catch (err) {
      // Never hang, never crash: a live failure becomes an honest health state.
      return {
        ...base,
        reachable: false,
        authed: false,
        detail: `${this.spec.name} health check failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  async fetchCostRows(window: CostWindow): Promise<CostRowsResult> {
    const credentials = this.requireConfigured('fetch cost rows');
    const exportRows = await this.transportFactory(credentials).fetchExportRows(window);
    // Reuse the existing version-negotiation shim: the cloud's FOCUS export is
    // upgraded to the v1.4 canonical model and given Ratio's value context.
    const { rows, backfilledColumns } = normalizeRows(exportRows, this.spec.id, this.spec.focusVersion);
    return {
      sourceId: this.spec.id,
      sourceVersion: this.spec.focusVersion,
      canonicalVersion: CANONICAL_FOCUS_VERSION,
      backfilledColumns,
      window,
      generatedAt: new Date().toISOString(),
      rows,
    };
  }

  // --- internals ---------------------------------------------------------

  private requireConfigured(action: string): Record<string, string> {
    if (this.status.state !== 'configured') {
      throw new Error(
        `${this.spec.name} not configured (${this.status.state}) — cannot ${action}; ` +
          `ships dark until ${this.spec.flagEnv} is on and credentials are set.`,
      );
    }
    return this.status.credentials;
  }
}

