// Public-cloud cost connectors (Azure / AWS / GCP) for the cost-ingest seam.
//
// Each cloud exposes a FOCUS-formatted cost export (Azure Cost Management FOCUS
// export to a storage container; AWS Data Exports "FOCUS 1.0 with AWS columns"
// to S3; GCP BigQuery FOCUS export). Ratio only needs the export rows — the
// version-negotiation shim upgrades whatever FOCUS version they emit (documented
// v1.0) up to the v1.4 canonical model. Only auth/fetch is cloud-specific.
//
// All three SHIP DARK: a per-cloud feature flag is OFF by default and, even when
// ON, the connector only goes live once its credentials are present. Status
// resolution is the generic, pure `resolveConnectorStatus` over a `ConnectorSpec`
// — see connectorConfig.ts. In a default build all three resolve to `disabled`
// and make zero network calls.

import type { CostSourceDescriptor } from './CostSourceClient';
import {
  connectorDescriptor,
  resolveConnectorStatus,
  type ConnectorSpec,
  type ConnectorStatus,
} from './connectorConfig';

type EnvRecord = Record<string, string | undefined>;

/** Canonical source ids across the seam. */
export const AZURE_SOURCE_ID = 'azure-cost-management';
export const AWS_SOURCE_ID = 'aws-data-exports';
export const GCP_SOURCE_ID = 'gcp-bigquery-focus';

/** Per-cloud feature-flag env vars. OFF unless explicitly truthy. */
export const AZURE_LIVE_FLAG_ENV = 'COSTSOURCE_AZURE_LIVE';
export const AWS_LIVE_FLAG_ENV = 'COSTSOURCE_AWS_LIVE';
export const GCP_LIVE_FLAG_ENV = 'COSTSOURCE_GCP_LIVE';

// Public clouds publish FOCUS-certified exports at v1.0 (the documented baseline
// AWS Data Exports advertises as "FOCUS 1.0 with AWS columns"). The shim covers
// any v1.0–v1.4 export, so this is the conservative native version.
const CLOUD_FOCUS_VERSION = '1.0' as const;

export const AZURE_CONNECTOR_SPEC: ConnectorSpec = {
  id: AZURE_SOURCE_ID,
  name: 'Azure Cost Management (FOCUS export)',
  kind: 'cloud',
  coverage: 'public_cloud',
  focusVersion: CLOUD_FOCUS_VERSION,
  capabilities: ['costRows'],
  flagEnv: AZURE_LIVE_FLAG_ENV,
  requiredEnv: {
    exportUrl: 'AZURE_FOCUS_EXPORT_URL',
    sasToken: 'AZURE_FOCUS_SAS',
  },
  liveSummary: 'Azure Cost Management FOCUS export from a storage container',
};

export const AWS_CONNECTOR_SPEC: ConnectorSpec = {
  id: AWS_SOURCE_ID,
  name: 'AWS Data Exports (FOCUS 1.0)',
  kind: 'cloud',
  coverage: 'public_cloud',
  focusVersion: CLOUD_FOCUS_VERSION,
  capabilities: ['costRows'],
  flagEnv: AWS_LIVE_FLAG_ENV,
  requiredEnv: {
    bucket: 'AWS_FOCUS_EXPORT_BUCKET',
    region: 'AWS_REGION',
    accessKeyId: 'AWS_ACCESS_KEY_ID',
    secretAccessKey: 'AWS_SECRET_ACCESS_KEY',
  },
  liveSummary: 'AWS Data Exports "FOCUS 1.0 with AWS columns" from an S3 bucket',
};

export const GCP_CONNECTOR_SPEC: ConnectorSpec = {
  id: GCP_SOURCE_ID,
  name: 'GCP BigQuery (FOCUS export)',
  kind: 'cloud',
  coverage: 'public_cloud',
  focusVersion: CLOUD_FOCUS_VERSION,
  capabilities: ['costRows'],
  flagEnv: GCP_LIVE_FLAG_ENV,
  requiredEnv: {
    dataset: 'GCP_FOCUS_BQ_DATASET',
    projectId: 'GCP_PROJECT_ID',
    credentials: 'GOOGLE_APPLICATION_CREDENTIALS',
  },
  liveSummary: 'GCP BigQuery FOCUS export billing dataset',
};

/** The public-cloud connector specs, in Azure / AWS / GCP order. */
export const CLOUD_CONNECTOR_SPECS: ConnectorSpec[] = [
  AZURE_CONNECTOR_SPEC,
  AWS_CONNECTOR_SPEC,
  GCP_CONNECTOR_SPEC,
];

// Per-cloud resolver + descriptor wrappers — thin sugar over the generic helper,
// kept for parity with `resolvePointFiveStatus` / `pointFiveLiveDescriptor` and
// so callers (tests, seed) can name a cloud directly.

export function resolveAzureStatus(env: EnvRecord): ConnectorStatus {
  return resolveConnectorStatus(AZURE_CONNECTOR_SPEC, env);
}
export function resolveAwsStatus(env: EnvRecord): ConnectorStatus {
  return resolveConnectorStatus(AWS_CONNECTOR_SPEC, env);
}
export function resolveGcpStatus(env: EnvRecord): ConnectorStatus {
  return resolveConnectorStatus(GCP_CONNECTOR_SPEC, env);
}

export function azureDescriptor(status: ConnectorStatus): CostSourceDescriptor {
  return connectorDescriptor(AZURE_CONNECTOR_SPEC, status);
}
export function awsDescriptor(status: ConnectorStatus): CostSourceDescriptor {
  return connectorDescriptor(AWS_CONNECTOR_SPEC, status);
}
export function gcpDescriptor(status: ConnectorStatus): CostSourceDescriptor {
  return connectorDescriptor(GCP_CONNECTOR_SPEC, status);
}

