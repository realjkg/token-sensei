// Registry of every config-gated FOCUS-export connector added in the cloud-
// connectors MVP (public cloud trio + Kubernetes + Nutanix). Centralizing the
// spec list keeps the seed registry and the mock client's dispatch in agreement
// on exactly which sources route through `CloudConnectorAdapter`.
//
// PointFive is deliberately NOT here: it speaks MCP/OAuth and has its own adapter
// (`PointFiveLiveAdapter`). These connectors share one FOCUS-export adapter.

import type { ConnectorSpec } from './connectorConfig';
import { CLOUD_CONNECTOR_SPECS } from './cloudConnectorConfig';
import { KUBERNETES_CONNECTOR_SPEC } from './kubernetesConfig';
import { NUTANIX_CONNECTOR_SPEC } from './nutanixConfig';

/** All FOCUS-export connectors that route through `CloudConnectorAdapter`. */
export const FOCUS_EXPORT_CONNECTOR_SPECS: ConnectorSpec[] = [
  ...CLOUD_CONNECTOR_SPECS,
  KUBERNETES_CONNECTOR_SPEC,
  NUTANIX_CONNECTOR_SPEC,
];

/** Find the connector spec for a source id, or undefined if it is not one. */
export function findConnectorSpec(sourceId: string): ConnectorSpec | undefined {
  return FOCUS_EXPORT_CONNECTOR_SPECS.find((spec) => spec.id === sourceId);
}

