# CAF "Govern and secure AI agents across your organization" — control mapping

Source guidance:
- <https://learn.microsoft.com/azure/cloud-adoption-framework/ai-agents/governance-security-across-organization>
- <https://learn.microsoft.com/azure/cloud-adoption-framework/scenarios/ai/> (AI landing zone / Application landing zone)
- <https://learn.microsoft.com/power-platform/guidance/adoption/dlp-strategy> (Power Platform DLP)
- <https://learn.microsoft.com/microsoft-copilot-studio/security-and-governance> (Copilot Studio governance)
- <https://learn.microsoft.com/entra/identity/> (Microsoft Entra Agent ID — non-human/agent identities)

The CAF article frames AI-agent governance around five disciplines. This table
maps each recommendation to the artifact in this repo that implements it.

## 1. Identify and inventory agents

| CAF recommendation | Implementation |
|---|---|
| Treat every agent as a discrete, named identity (a new identity class). | `workloads/insurance-app/identity-agents.tf` — one `azuread_application` + service principal **or** one `azurerm_user_assigned_identity` per agent (`policy-intake-agent`, `claims-triage-agent`, `underwriting-copilot`). Copilot Studio / AI Foundry agents receive an **Entra Agent ID** automatically when created in a Managed Environment; the Terraform records and tags them. |
| Maintain a catalog/registry of agents with owners. | Tags `agentName`, `agentOwner`, `agentPurpose`, `dataClassification` enforced by the `require-agent-resource-tags` policy; the Power Platform **CoE Starter Kit** (referenced in `workloads/insurance-app/README.md`) provides the live inventory. |
| Decommission unused agents. | Lifecycle notes + `expiresOn` tag in `workloads/insurance-app/variables.tf`; access reviews recommended in `docs` (see "Operating model"). |

## 2. Govern agent identity and access

| CAF recommendation | Implementation |
|---|---|
| Give each agent its own identity; never share or impersonate users. | Per-agent identities in `identity-agents.tf`; no agent uses a user account or a shared SP. |
| Prefer managed identities / workload identity federation over secrets. | `azurerm_user_assigned_identity` + `azuread_application_federated_identity_credential` for agents that run on Azure compute or in GitHub Actions; **no client secrets are created**. Key material that is unavoidable lives in Key Vault (`key-vault.tf`). |
| Apply least privilege with scoped RBAC and scoped API permissions. | Narrow `azurerm_role_assignment`s (e.g., `Cognitive Services OpenAI User`, `Key Vault Secrets User`, `Search Index Data Reader`) scoped to the specific resource, not the subscription. |
| Apply Conditional Access to agent identities. | `identity-agents.tf` tags identities into the `ai-agents` security group; a Conditional Access policy (named `CA-AI-Agents-Restrict`, managed in Entra, documented here) blocks legacy auth, requires the agents to originate from the workload's named locations / IP ranges, and blocks interactive sign-in. |
| Use PIM / just-in-time for any elevated agent access. | Documented in the operating model; elevated roles are eligible-only. |

## 3. Run agents inside a landing zone (Application Platform landing zone)

| CAF recommendation | Implementation |
|---|---|
| Place agent workloads in an **Application landing zone** under the **Application Platform** management group. **If one does not exist, create it.** | `landing-zones/application-platform/management-group.tf` creates the `alz-application-platform` management group (under the platform / "Landing Zones" MG) **only if it is absent**, then `subscription-vending.tf` vends/associates the `insurance-app` subscription beneath it. |
| Connect the workload spoke to the connectivity hub; use platform DNS, firewall, monitoring. | `landing-zones/application-platform/networking.tf` — spoke VNet, subnets (`snet-privateendpoints`, `snet-powerplatform-vnet-injection`, `snet-apim`), peering to the hub VNet, links to the platform Private DNS zones; `monitoring.tf` wires the spoke to the central Log Analytics workspace. |
| All PaaS over private endpoints; disable public network access. | `workloads/insurance-app/networking.tf` creates private endpoints for AI Foundry, Azure OpenAI, AI Search, Key Vault, Storage, APIM; `publicNetworkAccess = "Disabled"` everywhere; egress is forced through the hub Azure Firewall via UDR. Enforced by the `deny-ai-public-network-access` policy. |

## 4. Govern data and content (responsible AI)

| CAF recommendation | Implementation |
|---|---|
| Use Microsoft Purview / DSPM for AI for cataloging, sensitivity labels, DLP, and prompt/response auditing. | `workloads/insurance-app/observability.tf` references the tenant Purview account and enables the AI audit connector; sensitivity-label enforcement is a tenant control documented here. |
| Ground agents only on approved data sources; honor label-based access. | AI Search data sources are explicit inputs in `variables.tf`; the Copilot Studio agents are configured (in the Managed Environment) to use only those knowledge sources. |
| Apply content safety (jailbreak/prompt shields, groundedness, blocklists). | `ai-foundry.tf` provisions an **Azure AI Content Safety** resource and a default blocklist; **Microsoft Defender for Cloud — AI threat protection** plan is enabled in `landing-zones/application-platform/monitoring.tf`. |
| Human-in-the-loop for sensitive actions. | Copilot Studio topics for bind/quote/payout actions are flagged for confirmation; documented in `workloads/insurance-app/README.md`. |

## 5. Govern with policy as code

| CAF recommendation | Implementation (`policy-as-code/`) |
|---|---|
| Restrict the regions AI resources can deploy to. | `definitions/allowed-ai-locations.json` |
| Allow only approved/managed models. | `definitions/allowed-aoai-model-deployments.json` (parameter: list of `model.name`/`model.version` pairs, e.g. `gpt-4o`, `text-embedding-3-large`). |
| Deny public network access on AI resources / require private endpoints. | `definitions/deny-ai-public-network-access.json` |
| Disable local/key auth on Cognitive Services / AI resources (force Entra ID). | `definitions/deny-cognitive-services-local-auth.json` |
| Audit/require managed identity on agent-hosting resources. | `definitions/audit-managed-identity-on-agents.json` |
| Require diagnostic settings → central Log Analytics for AI + Power Platform resources. | `definitions/require-diagnostic-settings-ai.json` |
| Require ownership/classification tags on agent resources. | `definitions/require-agent-resource-tags.json` |
| Bundle into one initiative and assign at the Application Platform MG. | `initiative/ai-agent-governance-initiative.json` + `initiative/policy_assignments.tf` (assigns to `alz-application-platform` with a managed identity for `deployIfNotExists`/`modify` effects, and creates an exemption hook for break-glass). |

## 6. Low-code platform governance (Power Platform / Copilot Studio)

| CAF recommendation | Implementation (`workloads/insurance-app/`) |
|---|---|
| Use an environment strategy with separate dev/test/prod environments. | `power-platform.tf` creates `insurance-dev`, `insurance-test`, `insurance-prod` environments (Dataverse-enabled). |
| Use **Managed Environments** for governance (sharing limits, solution checker, usage insights, IP firewall, CMK). | `power-platform.tf` flips each environment to **Managed**, sets maker sharing limits, enforces Solution Checker on publish, enables weekly usage insights, and binds the environment IP firewall to the spoke ranges. |
| Apply **DLP policies** that classify the connector catalog (Business / Non-Business / Blocked) and restrict custom connectors. | `dlp-policy.tf` — a tenant-level "baseline" DLP policy plus an environment-scoped policy: insurance line-of-business + Microsoft 365 + Azure connectors → **Business**; general utility connectors → **Non-Business**; social media, consumer storage, unsanctioned AI, and "send to anyone" connectors → **Blocked**; custom connectors restricted to an approved URL pattern (the APIM gateway host). Connector lists are variables — adaptive. |
| Front custom / API connectors with Azure API Management. | `connectors-apim.tf` provisions an internal-VNet APIM instance; `connectors/insurance-policy-api.openapi.yaml` and `connectors/claims-api.openapi.yaml` are imported as APIM APIs and surfaced as Power Platform **custom connectors** with Entra ID auth. |
| Provide the widest array of template connectivity. | The DLP "Business" group is seeded from the full set of Microsoft-published/certified connectors relevant to insurance (Dataverse, SharePoint, Outlook, Teams, SQL, Azure Blob, Service Bus, Azure OpenAI, AI Builder, DocuSign, Adobe Sign, Salesforce, Dynamics 365, etc.) — see `variables.tf` `business_connectors`. |
| Copilot Studio agents: Entra ID auth, scoped knowledge, ALM via solutions/pipelines, get an Entra Agent ID. | Documented + the Managed Environment + DLP make this enforceable; agent ALM uses Power Platform pipelines (referenced in `README.md`). |

## 7. Observability and traceability

| CAF recommendation | Implementation |
|---|---|
| Centralized logging and a SIEM. | Central Log Analytics in `landing-zones/application-platform/monitoring.tf`; Microsoft Sentinel onboarded onto that workspace; diagnostic settings enforced by policy. |
| Per-agent telemetry. | `workloads/insurance-app/observability.tf` — one Application Insights component per agent, connected to the central workspace. |
| Audit who/what invoked the agent, which tools/connectors ran, what data was touched, prompts/responses. | Purview AI audit + Power Platform activity logging + APIM request logging to Log Analytics + AI Foundry trace export — every action correlates back to the agent's Entra Agent ID via the `agentName` dimension. |
| AI threat protection. | Defender for Cloud AI plan (prompt-injection / anomalous-usage detection) enabled at the subscription. |

## Operating model (shared responsibility)

| Team | Owns |
|---|---|
| **Platform** | `landing-zones/application-platform/`, `policy-as-code/`, hub networking, central Log Analytics/Sentinel, Defender plans, the tenant DLP baseline. |
| **Workload (insurance)** | `workloads/insurance-app/` — the Power Platform environments, the agents, the APIM connectors, the workload Key Vault and App Insights. |
| **Security / Identity** | Entra Agent ID lifecycle, Conditional Access for agent identities, access reviews, Purview labels/DSPM-for-AI, Sentinel content. |

Access reviews run quarterly over the `ai-agents` group; any agent without an
owner or past its `expiresOn` tag is disabled then deleted.
