// Kubernetes private-cloud cost connector (OpenCost / Kubecost FOCUS export).
//
// OpenCost and Kubecost both publish FOCUS-formatted cost exports for in-cluster
// workloads. Ratio consumes those rows through the same version shim as every
// other source — only the endpoint + (optional) bearer token is connector-
// specific. SHIPS DARK: `COSTSOURCE_KUBERNETES_LIVE` is OFF by default and the
// connector only goes live once the FOCUS endpoint is configured.
//
// The optional token is read by the live transport (when wired), not required at
// resolution time, so an unauthenticated in-cluster endpoint still resolves to
// `configured` with just the endpoint present.

import type { CostSourceDescriptor } from './CostSourceClient';
import {
  connectorDescriptor,
  resolveConnectorStatus,
  type ConnectorSpec,
  type ConnectorStatus,
} from './connectorConfig';

type EnvRecord = Record<string, string | undefined>;

/** Canonical source id across the seam. */
export const KUBERNETES_SOURCE_ID = 'kubernetes';

/** Feature-flag env var. OFF unless explicitly truthy. */
export const KUBERNETES_LIVE_FLAG_ENV = 'COSTSOURCE_KUBERNETES_LIVE';

/** Optional bearer-token env var, consumed by the live transport when present. */
export const KUBERNETES_TOKEN_ENV = 'KUBERNETES_FOCUS_TOKEN';

export const KUBERNETES_CONNECTOR_SPEC: ConnectorSpec = {
  id: KUBERNETES_SOURCE_ID,
  name: 'Kubernetes (OpenCost / Kubecost FOCUS export)',
  kind: 'kubernetes',
  coverage: 'private_cloud',
  focusVersion: '1.0',
  capabilities: ['costRows'],
  flagEnv: KUBERNETES_LIVE_FLAG_ENV,
  requiredEnv: {
    endpoint: 'KUBERNETES_FOCUS_ENDPOINT',
  },
  liveSummary: 'OpenCost / Kubecost FOCUS export over an in-cluster endpoint',
};

export function resolveKubernetesStatus(env: EnvRecord): ConnectorStatus {
  return resolveConnectorStatus(KUBERNETES_CONNECTOR_SPEC, env);
}

export function kubernetesDescriptor(status: ConnectorStatus): CostSourceDescriptor {
  return connectorDescriptor(KUBERNETES_CONNECTOR_SPEC, status);
}

