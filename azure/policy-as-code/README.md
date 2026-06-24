# Policy as code — AI agent governance

Azure Policy definitions and the `ai-agent-governance` initiative (policy set)
that the platform team assigns at the **Application Platform management group**
scope. This is the "governed with policy as code" requirement from the CAF
AI-agent guidance.

## Contents

| Path | Purpose |
|---|---|
| `definitions/allowed-ai-locations.json` | Deny AI/Cognitive Services/Search/AI Foundry/APIM/Key Vault resources outside the approved region list. |
| `definitions/allowed-aoai-model-deployments.json` | Deny Azure OpenAI / AI Foundry model deployments that are not on the approved `model.name` (and optionally `model.version`) list. |
| `definitions/deny-ai-public-network-access.json` | Deny Cognitive Services accounts (incl. OpenAI), AI Search, ML/AI Foundry workspaces, Key Vault, and Storage with `publicNetworkAccess` enabled — forces private endpoints. |
| `definitions/deny-cognitive-services-local-auth.json` | Deny Cognitive Services / OpenAI accounts that allow local (key) auth — forces Entra ID auth so every call is attributable to an agent identity. |
| `definitions/audit-managed-identity-on-agents.json` | Audit AI-hosting resources (Cognitive Services, App Service/Functions, Container Apps, AML online endpoints) that do not have a managed identity assigned. |
| `definitions/require-diagnostic-settings-ai.json` | `deployIfNotExists` — ensure Cognitive Services / OpenAI / AI Search / ML workspaces / APIM stream diagnostics to the central Log Analytics workspace. |
| `definitions/require-agent-resource-tags.json` | `modify`/`deny` — require `agentOwner`, `agentPurpose`, `dataClassification`, and `expiresOn` tags on resource groups and AI resources. |
| `initiative/ai-agent-governance-initiative.json` | The policy set bundling all of the above with sensible default parameters. |
| `initiative/policy_assignments.tf` | Publishes the definitions + initiative and assigns the initiative at the Application Platform MG with a user-assigned identity for the `deployIfNotExists`/`modify` effects. |

## Deploy

```bash
cd azure/policy-as-code/initiative
terraform init
terraform apply \
  -var "management_group_id=/providers/Microsoft.Management/managementGroups/alz-application-platform" \
  -var "central_log_analytics_workspace_id=/subscriptions/.../workspaces/law-application-platform" \
  -var "policy_remediation_identity_id=/subscriptions/.../userAssignedIdentities/id-ai-agent-policy-remediation" \
  -var 'allowed_locations=["eastus2","swedencentral"]' \
  -var 'allowed_aoai_models=[{name="gpt-4o"},{name="gpt-4o-mini"},{name="text-embedding-3-large"}]'
```

(Or wire the values straight from the landing-zone module's `landing_zone_summary` output.)

## Adaptive by design

`allowed_locations`, `allowed_aoai_models`, the required tag list, and the
diagnostic-settings target are all initiative parameters — tighten or relax the
posture by changing the assignment, not the code. Add an
`azurerm_management_group_policy_exemption` for break-glass when genuinely needed.
