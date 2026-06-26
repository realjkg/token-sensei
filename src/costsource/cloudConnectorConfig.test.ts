// Tests for the cloud-connectors MVP config resolvers (cloud trio + Kubernetes
// + Nutanix), all built on the generic `resolveConnectorStatus` helper.
//
// Coverage:
//   1. resolveConnectorStatus / per-connector resolvers — disabled /
//      unconfigured / configured branches, pure over an env record
//   2. Feature-flag truthiness parsing (off by default, ships dark)
//   3. Descriptor honesty — `configured` tracks the status; coverage/kind/version
//   4. Seed registration — every connector is registered dark in a default build
//      without breaking the existing three sources
//
// All pure — no process.env, no network.

import { describe, it, expect } from 'vitest';
import { isConnectorEnabled } from './connectorConfig';
import {
  AZURE_CONNECTOR_SPEC,
  AWS_CONNECTOR_SPEC,
  GCP_CONNECTOR_SPEC,
  AZURE_SOURCE_ID,
  AWS_SOURCE_ID,
  GCP_SOURCE_ID,
  resolveAzureStatus,
  resolveAwsStatus,
  resolveGcpStatus,
  azureDescriptor,
  awsDescriptor,
  gcpDescriptor,
} from './cloudConnectorConfig';
import {
  KUBERNETES_CONNECTOR_SPEC,
  KUBERNETES_SOURCE_ID,
  resolveKubernetesStatus,
  kubernetesDescriptor,
} from './kubernetesConfig';
import {
  NUTANIX_CONNECTOR_SPEC,
  NUTANIX_SOURCE_ID,
  resolveNutanixStatus,
  nutanixDescriptor,
} from './nutanixConfig';
import { FOCUS_EXPORT_CONNECTOR_SPECS, findConnectorSpec } from './focusExportConnectors';
import { COST_SOURCES } from './seed';

const CONFIGURED_ENV: Record<string, Record<string, string>> = {
  [AZURE_SOURCE_ID]: {
    COSTSOURCE_AZURE_LIVE: 'true',
    AZURE_FOCUS_EXPORT_URL: 'https://example.blob.core.windows.net/focus',
    AZURE_FOCUS_SAS: 'sv=2024-01-01&sig=abc',
  },
  [AWS_SOURCE_ID]: {
    COSTSOURCE_AWS_LIVE: 'true',
    AWS_FOCUS_EXPORT_BUCKET: 'ratio-focus-exports',
    AWS_REGION: 'us-east-1',
    AWS_ACCESS_KEY_ID: 'AKIAEXAMPLE',
    AWS_SECRET_ACCESS_KEY: 'secret',
  },
  [GCP_SOURCE_ID]: {
    COSTSOURCE_GCP_LIVE: 'true',
    GCP_FOCUS_BQ_DATASET: 'billing.focus_export',
    GCP_PROJECT_ID: 'ratio-prod',
    GOOGLE_APPLICATION_CREDENTIALS: '/secrets/gcp.json',
  },
  [KUBERNETES_SOURCE_ID]: {
    COSTSOURCE_KUBERNETES_LIVE: 'true',
    KUBERNETES_FOCUS_ENDPOINT: 'http://opencost.kube-system.svc/focus',
  },
  [NUTANIX_SOURCE_ID]: {
    COSTSOURCE_NUTANIX_LIVE: 'true',
    NUTANIX_ENDPOINT: 'https://ncm.example/api/cost',
    NUTANIX_API_KEY: 'ntnx-key',
  },
};

// ---------------------------------------------------------------------------
// 1. Generic flag parsing
// ---------------------------------------------------------------------------

describe('isConnectorEnabled', () => {
  it('is OFF by default and for falsey values (ships dark)', () => {
    expect(isConnectorEnabled(AZURE_CONNECTOR_SPEC, {})).toBe(false);
    expect(isConnectorEnabled(AZURE_CONNECTOR_SPEC, { COSTSOURCE_AZURE_LIVE: 'false' })).toBe(false);
    expect(isConnectorEnabled(AZURE_CONNECTOR_SPEC, { COSTSOURCE_AZURE_LIVE: '0' })).toBe(false);
    expect(isConnectorEnabled(AZURE_CONNECTOR_SPEC, { COSTSOURCE_AZURE_LIVE: '' })).toBe(false);
  });

  it('is ON only for explicit truthy values', () => {
    for (const v of ['1', 'true', 'on', 'yes', 'TRUE', ' Yes ']) {
      expect(isConnectorEnabled(AZURE_CONNECTOR_SPEC, { COSTSOURCE_AZURE_LIVE: v })).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Per-connector status resolution (disabled / unconfigured / configured)
// ---------------------------------------------------------------------------

const CASES = [
  { name: 'Azure', spec: AZURE_CONNECTOR_SPEC, resolve: resolveAzureStatus },
  { name: 'AWS', spec: AWS_CONNECTOR_SPEC, resolve: resolveAwsStatus },
  { name: 'GCP', spec: GCP_CONNECTOR_SPEC, resolve: resolveGcpStatus },
  { name: 'Kubernetes', spec: KUBERNETES_CONNECTOR_SPEC, resolve: resolveKubernetesStatus },
  { name: 'Nutanix', spec: NUTANIX_CONNECTOR_SPEC, resolve: resolveNutanixStatus },
] as const;

describe.each(CASES)('$name connector status', ({ spec, resolve }) => {
  it('is disabled when the flag is absent (ships dark by default)', () => {
    expect(resolve({}).state).toBe('disabled');
  });

  it('is unconfigured when the flag is ON but credentials are missing', () => {
    const status = resolve({ [spec.flagEnv]: 'true' });
    expect(status.state).toBe('unconfigured');
    if (status.state === 'unconfigured') {
      // Every required env var is reported missing.
      for (const envName of Object.values(spec.requiredEnv)) {
        expect(status.missing).toContain(envName);
      }
    }
  });

  it('is configured when the flag is ON and all credentials are present', () => {
    const status = resolve(CONFIGURED_ENV[spec.id]);
    expect(status.state).toBe('configured');
    if (status.state === 'configured') {
      // Every logical credential key is resolved.
      for (const key of Object.keys(spec.requiredEnv)) {
        expect(status.credentials[key]).toBeTruthy();
      }
    }
  });

  it('is pure — resolving twice over the same env yields the same state', () => {
    expect(resolve(CONFIGURED_ENV[spec.id]).state).toBe(resolve(CONFIGURED_ENV[spec.id]).state);
  });
});

// ---------------------------------------------------------------------------
// 3. Descriptor honesty
// ---------------------------------------------------------------------------

describe('connector descriptors', () => {
  it('mark the source dark (configured:false) when disabled', () => {
    expect(azureDescriptor(resolveAzureStatus({})).configured).toBe(false);
    expect(awsDescriptor(resolveAwsStatus({})).configured).toBe(false);
    expect(gcpDescriptor(resolveGcpStatus({})).configured).toBe(false);
    expect(kubernetesDescriptor(resolveKubernetesStatus({})).configured).toBe(false);
    expect(nutanixDescriptor(resolveNutanixStatus({})).configured).toBe(false);
  });

  it('flip to configured:true when fully configured', () => {
    expect(azureDescriptor(resolveAzureStatus(CONFIGURED_ENV[AZURE_SOURCE_ID])).configured).toBe(
      true,
    );
  });

  it('carry the expected kind / coverage / capabilities / version', () => {
    const azure = azureDescriptor(resolveAzureStatus({}));
    expect(azure.kind).toBe('cloud');
    expect(azure.coverage).toBe('public_cloud');
    expect(azure.focusVersion).toBe('1.0');
    expect(azure.capabilities).toEqual(['costRows']);

    expect(kubernetesDescriptor(resolveKubernetesStatus({})).coverage).toBe('private_cloud');
    expect(kubernetesDescriptor(resolveKubernetesStatus({})).kind).toBe('kubernetes');
    expect(nutanixDescriptor(resolveNutanixStatus({})).coverage).toBe('on_prem');
    expect(nutanixDescriptor(resolveNutanixStatus({})).kind).toBe('nutanix');
  });
});

// ---------------------------------------------------------------------------
// 4. Registry + seed wiring
// ---------------------------------------------------------------------------

describe('connector registry', () => {
  it('exposes all five FOCUS-export connectors and finds them by id', () => {
    expect(FOCUS_EXPORT_CONNECTOR_SPECS).toHaveLength(5);
    for (const id of [
      AZURE_SOURCE_ID,
      AWS_SOURCE_ID,
      GCP_SOURCE_ID,
      KUBERNETES_SOURCE_ID,
      NUTANIX_SOURCE_ID,
    ]) {
      expect(findConnectorSpec(id)?.id).toBe(id);
    }
    expect(findConnectorSpec('pointfive-live')).toBeUndefined();
  });

  it('registers every new connector in the seed (dark in a default build) without dropping the originals', () => {
    const ids = COST_SOURCES.map((s) => s.id);
    // Existing three sources are preserved.
    expect(ids).toContain('pointfive-sandbox');
    expect(ids).toContain('focus-file-sandbox');
    expect(ids).toContain('pointfive-live');
    // New connectors are registered.
    for (const id of [
      AZURE_SOURCE_ID,
      AWS_SOURCE_ID,
      GCP_SOURCE_ID,
      KUBERNETES_SOURCE_ID,
      NUTANIX_SOURCE_ID,
    ]) {
      const descriptor = COST_SOURCES.find((s) => s.id === id);
      expect(descriptor).toBeDefined();
      // Default build has no flags set → every connector ships dark.
      expect(descriptor?.configured).toBe(false);
    }
  });
});

