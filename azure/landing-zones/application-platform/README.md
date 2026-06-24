# Application Platform landing zone

Per the CAF AI-agent governance guidance, agent workloads must live in an
**Application landing zone** under an **Application Platform management group**.
This module **creates that management group if it does not already exist** and
then vends the `insurance-app` workload landing zone underneath it, wires its
spoke network to the connectivity hub, and connects it to central monitoring.

Run this as the **platform team**, before any workload or policy deployment.

## What it provisions

| File | Resources |
|---|---|
| `management-group.tf` | `alz-application-platform` management group (child of the platform "Landing Zones" MG). Uses a data source first; only creates it when absent. |
| `subscription-vending.tf` | Associates (or vends, via `azurerm_subscription`) the `insurance-app` subscription and moves it under `alz-application-platform`. Applies platform tags and a budget. |
| `networking.tf` | Spoke VNet (`vnet-insurance-app`), subnets — `snet-privateendpoints`, `snet-powerplatform` (delegated to `Microsoft.PowerPlatform/enterprisePolicies` for VNet injection), `snet-apim`; VNet peering to the hub; links to platform Private DNS zones for the PaaS used by the workload. Route table forcing egress to the hub firewall. |
| `identity.tf` | Platform user-assigned managed identity used by the policy initiative's `deployIfNotExists`/`modify` remediations; the `ai-agents` Entra security group that agent identities are placed into (Conditional Access target). |
| `monitoring.tf` | Central Log Analytics workspace (or reference to the platform one), Microsoft Sentinel onboarding, Defender for Cloud plans including **AI threat protection**, an Activity Log diagnostic setting. |

## Inputs

See `variables.tf` and `terraform.tfvars.example`. Key ones:

- `platform_landing_zones_mg_id` — the existing platform "Landing Zones" MG to nest under.
- `hub_vnet_id`, `hub_firewall_private_ip`, `platform_private_dns_zone_ids` — connectivity-hub references.
- `insurance_subscription_id` — the subscription to place under the new MG (leave blank to vend a new one if you have an EA/MCA billing scope).
- `central_log_analytics_workspace_id` — set to reuse the platform workspace instead of creating one.
