// Nutanix on-prem cost connector (Nutanix Cloud Manager cost governance export).
//
// Nutanix Cloud Manager (NCM) produces cost-governance / showback data for
// on-prem and private-cloud infrastructure. Once exported in FOCUS form it flows
// through Ratio's version shim like any other source — only the endpoint + API
// credential is connector-specific. SHIPS DARK: `COSTSOURCE_NUTANIX_LIVE` is OFF
// by default and the connector only goes live once endpoint + credential exist.

import type { CostSourceDescriptor } from './CostSourceClient';
import {
  connectorDescriptor,
  resolveConnectorStatus,
  type ConnectorSpec,
  type ConnectorStatus,
} from './connectorConfig';

type EnvRecord = Record<string, string | undefined>;

/** Canonical source id across the seam. */
export const NUTANIX_SOURCE_ID = 'nutanix';

/** Feature-flag env var. OFF unless explicitly truthy. */
export const NUTANIX_LIVE_FLAG_ENV = 'COSTSOURCE_NUTANIX_LIVE';

export const NUTANIX_CONNECTOR_SPEC: ConnectorSpec = {
  id: NUTANIX_SOURCE_ID,
  name: 'Nutanix Cloud Manager (cost governance FOCUS export)',
  kind: 'nutanix',
  coverage: 'on_prem',
  focusVersion: '1.0',
  capabilities: ['costRows'],
  flagEnv: NUTANIX_LIVE_FLAG_ENV,
  requiredEnv: {
    endpoint: 'NUTANIX_ENDPOINT',
    apiKey: 'NUTANIX_API_KEY',
  },
  liveSummary: 'Nutanix Cloud Manager cost governance export normalized to FOCUS',
};

export function resolveNutanixStatus(env: EnvRecord): ConnectorStatus {
  return resolveConnectorStatus(NUTANIX_CONNECTOR_SPEC, env);
}

export function nutanixDescriptor(status: ConnectorStatus): CostSourceDescriptor {
  return connectorDescriptor(NUTANIX_CONNECTOR_SPEC, status);
}

