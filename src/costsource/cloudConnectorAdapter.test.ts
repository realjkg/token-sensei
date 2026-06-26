// Tests for CloudConnectorAdapter — the shared FOCUS-export adapter for the
// cloud-connectors MVP (cloud trio + Kubernetes + Nutanix), all shipping DARK.
//
// Coverage:
//   1. Flag-OFF inert path — dark health, throwing fetchCostRows, and provably
//      ZERO network: the transport factory is never called
//   2. Unconfigured health (flag ON, creds missing) — honest not-authed state
//   3. FOCUS v1.0 → v1.4 normalization via the reused shim (configured path),
//      with the correct backfilledColumns and Ratio value attached (R4)
//   4. Configured health — reachable via a mocked transport; honest failure
//      when the transport throws
//   5. Default (unwired) transport on the configured path throws "not wired"
//      rather than fabricating data
//
// The transport is always injected — no real network call in tests or CI.

import { describe, it, expect, vi } from 'vitest';
import { CloudConnectorAdapter, type FocusExportTransport } from './CloudConnectorAdapter';
import {
  AZURE_CONNECTOR_SPEC,
  AWS_CONNECTOR_SPEC,
  GCP_CONNECTOR_SPEC,
  AZURE_SOURCE_ID,
} from './cloudConnectorConfig';
import { KUBERNETES_CONNECTOR_SPEC } from './kubernetesConfig';
import { NUTANIX_CONNECTOR_SPEC } from './nutanixConfig';
import type { ConnectorSpec } from './connectorConfig';
import { columnsAddedAfter } from './focusVersions';
import { rawRowsForVersion } from './seed';

const WINDOW = { start: '2026-06-01T00:00:00.000Z', end: '2026-07-01T00:00:00.000Z' };

const CONFIGURED_ENV: Record<string, Record<string, string>> = {
  [AZURE_CONNECTOR_SPEC.id]: {
    COSTSOURCE_AZURE_LIVE: 'true',
    AZURE_FOCUS_EXPORT_URL: 'https://example.blob.core.windows.net/focus',
    AZURE_FOCUS_SAS: 'sv=2024-01-01&sig=abc',
  },
  [AWS_CONNECTOR_SPEC.id]: {
    COSTSOURCE_AWS_LIVE: 'true',
    AWS_FOCUS_EXPORT_BUCKET: 'ratio-focus-exports',
    AWS_REGION: 'us-east-1',
    AWS_ACCESS_KEY_ID: 'AKIAEXAMPLE',
    AWS_SECRET_ACCESS_KEY: 'secret',
  },
  [GCP_CONNECTOR_SPEC.id]: {
    COSTSOURCE_GCP_LIVE: 'true',
    GCP_FOCUS_BQ_DATASET: 'billing.focus_export',
    GCP_PROJECT_ID: 'ratio-prod',
    GOOGLE_APPLICATION_CREDENTIALS: '/secrets/gcp.json',
  },
  [KUBERNETES_CONNECTOR_SPEC.id]: {
    COSTSOURCE_KUBERNETES_LIVE: 'true',
    KUBERNETES_FOCUS_ENDPOINT: 'http://opencost.kube-system.svc/focus',
  },
  [NUTANIX_CONNECTOR_SPEC.id]: {
    COSTSOURCE_NUTANIX_LIVE: 'true',
    NUTANIX_ENDPOINT: 'https://ncm.example/api/cost',
    NUTANIX_API_KEY: 'ntnx-key',
  },
};

/** A fake transport returning seed-derived FOCUS v1.0 export rows. */
function makeMockTransport(overrides: Partial<FocusExportTransport> = {}): FocusExportTransport {
  return {
    ping: async () => true,
    fetchExportRows: async () => rawRowsForVersion('1.0'),
    ...overrides,
  };
}

const SPECS: ConnectorSpec[] = [
  AZURE_CONNECTOR_SPEC,
  AWS_CONNECTOR_SPEC,
  GCP_CONNECTOR_SPEC,
  KUBERNETES_CONNECTOR_SPEC,
  NUTANIX_CONNECTOR_SPEC,
];

// ---------------------------------------------------------------------------
// 1. Flag-OFF inert path — dark, and provably no network
// ---------------------------------------------------------------------------

describe.each(SPECS)('CloudConnectorAdapter [$id] — flag OFF (ships dark)', (spec) => {
  it('healthCheck is not reachable / not authed and makes no network call', async () => {
    const transportFactory = vi.fn(() => makeMockTransport());
    const health = await new CloudConnectorAdapter(spec, { env: {}, transportFactory }).healthCheck();
    expect(health.sourceId).toBe(spec.id);
    expect(health.reachable).toBe(false);
    expect(health.authed).toBe(false);
    expect(health.canonicalVersion).toBe('1.4');
    expect(health.detail).toMatch(/ships dark/i);
    expect(transportFactory).not.toHaveBeenCalled();
  });

  it('fetchCostRows throws a typed not-configured error with no network call', async () => {
    const transportFactory = vi.fn(() => makeMockTransport());
    const adapter = new CloudConnectorAdapter(spec, { env: {}, transportFactory });
    await expect(adapter.fetchCostRows(WINDOW)).rejects.toThrow(/not configured/i);
    expect(transportFactory).not.toHaveBeenCalled();
  });

  it('describe() marks the source dark for listSources', () => {
    const descriptor = new CloudConnectorAdapter(spec, { env: {} }).describe();
    expect(descriptor.id).toBe(spec.id);
    expect(descriptor.configured).toBe(false);
    expect(descriptor.capabilities).toContain('costRows');
  });
});

// ---------------------------------------------------------------------------
// 2. Unconfigured (flag ON, creds missing)
// ---------------------------------------------------------------------------

describe('CloudConnectorAdapter — flag ON but unconfigured', () => {
  it('healthCheck is honest about missing credentials and makes no network call', async () => {
    const transportFactory = vi.fn(() => makeMockTransport());
    const adapter = new CloudConnectorAdapter(AZURE_CONNECTOR_SPEC, {
      env: { COSTSOURCE_AZURE_LIVE: 'true' },
      transportFactory,
    });
    const health = await adapter.healthCheck();
    expect(health.reachable).toBe(false);
    expect(health.authed).toBe(false);
    expect(health.detail).toMatch(/credentials missing/i);
    expect(transportFactory).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 3. FOCUS v1.0 → v1.4 normalization via the reused shim (configured path)
// ---------------------------------------------------------------------------

describe.each(SPECS)('CloudConnectorAdapter [$id] — fetchCostRows (configured)', (spec) => {
  it('normalizes the FOCUS v1.0 export up to the v1.4 canonical model', async () => {
    const transportFactory = vi.fn(() => makeMockTransport());
    const adapter = new CloudConnectorAdapter(spec, {
      env: CONFIGURED_ENV[spec.id],
      transportFactory,
    });

    const result = await adapter.fetchCostRows(WINDOW);
    expect(result.sourceId).toBe(spec.id);
    expect(result.sourceVersion).toBe('1.0');
    expect(result.canonicalVersion).toBe('1.4');
    expect(result.backfilledColumns).toEqual(columnsAddedAfter('1.0'));
    expect(result.rows.length).toBeGreaterThan(0);
    expect(transportFactory).toHaveBeenCalledTimes(1);

    const [row] = result.rows;
    // Backfilled canonical columns present (never missing).
    expect(typeof row.ListCost).toBe('number');
    expect(typeof row.ServiceSubcategory).toBe('string');
    expect(row.CapacityReservationId === null || typeof row.CapacityReservationId === 'string').toBe(
      true,
    );
    // Ratio value denominator attached (R4) and source attribution stamped.
    expect(row.x_RatioValueRatio).toBeGreaterThanOrEqual(0);
    expect(row.x_RatioSourceId).toBe(spec.id);
    expect(row.x_RatioSourceVersion).toBe('1.0');
  });
});

// ---------------------------------------------------------------------------
// 4. Configured health
// ---------------------------------------------------------------------------

describe('CloudConnectorAdapter — healthCheck (configured)', () => {
  it('is reachable + authed when the transport pings successfully', async () => {
    const transportFactory = vi.fn(() => makeMockTransport({ ping: async () => true }));
    const adapter = new CloudConnectorAdapter(AZURE_CONNECTOR_SPEC, {
      env: CONFIGURED_ENV[AZURE_SOURCE_ID],
      transportFactory,
    });
    const health = await adapter.healthCheck();
    expect(health.reachable).toBe(true);
    expect(health.authed).toBe(true);
    expect(transportFactory).toHaveBeenCalledTimes(1);
  });

  it('degrades to an honest unreachable state when the transport throws', async () => {
    const transportFactory = vi.fn(() =>
      makeMockTransport({
        ping: async () => {
          throw new Error('endpoint refused');
        },
      }),
    );
    const adapter = new CloudConnectorAdapter(AZURE_CONNECTOR_SPEC, {
      env: CONFIGURED_ENV[AZURE_SOURCE_ID],
      transportFactory,
    });
    const health = await adapter.healthCheck();
    expect(health.reachable).toBe(false);
    expect(health.authed).toBe(false);
    expect(health.detail).toMatch(/health check failed/i);
  });
});

// ---------------------------------------------------------------------------
// 5. Default (unwired) transport — loud, never fabricates data
// ---------------------------------------------------------------------------

describe('CloudConnectorAdapter — configured but unwired transport (MVP seam)', () => {
  it('fetchCostRows surfaces a clear "not wired" error instead of inventing rows', async () => {
    const adapter = new CloudConnectorAdapter(AZURE_CONNECTOR_SPEC, {
      env: CONFIGURED_ENV[AZURE_SOURCE_ID],
    });
    await expect(adapter.fetchCostRows(WINDOW)).rejects.toThrow(/not wired/i);
  });

  it('healthCheck degrades honestly when the default transport is unwired', async () => {
    const adapter = new CloudConnectorAdapter(AZURE_CONNECTOR_SPEC, {
      env: CONFIGURED_ENV[AZURE_SOURCE_ID],
    });
    const health = await adapter.healthCheck();
    expect(health.reachable).toBe(false);
    expect(health.detail).toMatch(/health check failed/i);
  });
});

