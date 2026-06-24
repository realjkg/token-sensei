# ---------------------------------------------------------------------------
# Agent identities.
#
# CAF: agents are a new identity class. Each agent gets:
#   * a user-assigned managed identity  -> used by the Azure-hosted tool/back-end
#     it calls (no secrets);
#   * an Entra application + service principal -> the registration the Copilot
#     Studio / AI Foundry agent uses; in tenants with Microsoft Entra Agent ID
#     enabled this surfaces the agent as a first-class "Agent" identity. Tag it
#     so it is discoverable in the agent inventory.
#   * membership in the `ai-agents` security group -> Conditional Access target
#     (block legacy auth, block interactive sign-in, pin to named locations).
#   * narrowly-scoped RBAC -> least privilege.
#   * (optional) workload-identity-federation subjects -> for CI/CD, never secrets.
# No client secrets are created anywhere in this file.
# ---------------------------------------------------------------------------

# --- user-assigned managed identities (one per agent) ----------------------
resource "azurerm_user_assigned_identity" "agent" {
  for_each            = var.agents
  name                = "id-agent-${each.key}"
  location            = azurerm_resource_group.identity.location
  resource_group_name = azurerm_resource_group.identity.name
  tags = merge(local.common_tags, {
    agentName    = each.key
    agentPurpose = each.value.purpose
    agentKind    = "managed-identity"
  })
}

# --- Entra app registrations (Entra Agent ID for the low-code agent) -------
resource "azuread_application" "agent" {
  for_each     = var.agents
  display_name = "agent-${each.key}-insurance"
  notes        = "Insurance agent platform - ${each.value.purpose}. Managed by Terraform. Reviewed quarterly via the ai-agents access review."

  # Surfaces in Entra as an agent identity where Entra Agent ID is enabled;
  # service-principal-only sign-in (no interactive users).
  sign_in_audience               = "AzureADMyOrg"
  fallback_public_client_enabled = false

  # azuread_application's `tags` and `feature_tags` are mutually exclusive. The
  # two magic values below are exactly what `feature_tags { enterprise = true,
  # hide = true }` sets: surface as an enterprise app, hidden from My Apps.
  tags = [
    "ai-agent",
    "insurance",
    "workload:insurance-agent-platform",
    "agent:${each.key}",
    "WindowsAzureActiveDirectoryIntegratedApp",
    "HideApp",
  ]
}

resource "azuread_service_principal" "agent" {
  for_each                     = var.agents
  client_id                    = azuread_application.agent[each.key].client_id
  app_role_assignment_required = true
  tags                         = ["ai-agent", "insurance", "agent:${each.key}"]
}

# IMPORTANT: no azuread_application_password / client secret. If a confidential
# credential is unavoidable for a partner system, store it in Key Vault and
# reference it via APIM, never embed it.

# --- workload identity federation (CI/CD) — no secrets --------------------
locals {
  federated_subjects = merge([
    for agent_name, cfg in var.agents : {
      for subj in cfg.federated_subjects :
      "${agent_name}::${subj}" => { agent = agent_name, subject = subj }
    }
  ]...)
}

resource "azuread_application_federated_identity_credential" "agent" {
  for_each       = local.federated_subjects
  application_id = azuread_application.agent[each.value.agent].id
  display_name   = "fic-${replace(each.value.subject, ":", "-")}"
  description    = "Workload identity federation for ${each.value.agent}."
  audiences      = ["api://AzureADTokenExchange"]
  issuer         = "https://token.actions.githubusercontent.com"
  subject        = each.value.subject
}

resource "azuread_application_federated_identity_credential" "cicd" {
  count          = var.cicd_github_repo == "" ? 0 : 1
  application_id = azuread_application.agent[keys(var.agents)[0]].id
  display_name   = "fic-cicd-insurance-prod"
  description    = "GitHub Actions OIDC for insurance-app solution deployment (no secrets)."
  audiences      = ["api://AzureADTokenExchange"]
  issuer         = "https://token.actions.githubusercontent.com"
  subject        = "repo:${var.cicd_github_repo}:environment:insurance-prod"
}

# --- put every agent identity into the ai-agents group --------------------
resource "azuread_group_member" "agent_mi" {
  for_each         = var.agents
  group_object_id  = var.ai_agents_group_object_id
  member_object_id = azurerm_user_assigned_identity.agent[each.key].principal_id
}

resource "azuread_group_member" "agent_sp" {
  for_each         = var.agents
  group_object_id  = var.ai_agents_group_object_id
  member_object_id = azuread_service_principal.agent[each.key].object_id
}

# ---------------------------------------------------------------------------
# Least-privilege RBAC for the agents' managed identities.
# Scoped to the specific resources only.
# ---------------------------------------------------------------------------

resource "azurerm_role_assignment" "agent_openai" {
  for_each             = { for k, v in var.agents : k => v if v.needs_openai }
  scope                = azurerm_cognitive_account.openai.id
  role_definition_name = "Cognitive Services OpenAI User"
  principal_id         = azurerm_user_assigned_identity.agent[each.key].principal_id
}

resource "azurerm_role_assignment" "agent_search" {
  for_each             = { for k, v in var.agents : k => v if v.needs_search }
  scope                = azurerm_search_service.grounding.id
  role_definition_name = "Search Index Data Reader"
  principal_id         = azurerm_user_assigned_identity.agent[each.key].principal_id
}

resource "azurerm_role_assignment" "agent_content_safety" {
  for_each             = { for k, v in var.agents : k => v if v.needs_content_safety }
  scope                = azurerm_cognitive_account.content_safety.id
  role_definition_name = "Cognitive Services User"
  principal_id         = azurerm_user_assigned_identity.agent[each.key].principal_id
}

resource "azurerm_role_assignment" "agent_keyvault" {
  for_each             = { for k, v in var.agents : k => v if v.keyvault_secret_reader }
  scope                = azurerm_key_vault.workload.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.agent[each.key].principal_id
}

# Agents may write their own telemetry but not read anyone else's.
resource "azurerm_role_assignment" "agent_appinsights" {
  for_each             = var.agents
  scope                = azurerm_application_insights.agent[each.key].id
  role_definition_name = "Monitoring Metrics Publisher"
  principal_id         = azurerm_user_assigned_identity.agent[each.key].principal_id
}

# ---------------------------------------------------------------------------
# Conditional Access for the agent identities.
#
# NOTE: a CA policy targeting service principals / workload identities ("CA-AI-
# Agents-Restrict") should be created in Entra ID (Conditional Access for
# workload identities is licensed separately). It targets the `ai-agents` group
# and: blocks legacy authentication, blocks interactive sign-in, and restricts
# sign-in to the named locations covering the spoke / APIM egress IPs. Manage it
# via your identity-governance pipeline; it is documented in
# ../../docs/caf-ai-agent-governance-mapping.md.
# ---------------------------------------------------------------------------

output "agent_identities" {
  description = "Per-agent identity details for wiring into Copilot Studio / AI Foundry."
  value = {
    for k in keys(var.agents) : k => {
      managed_identity_client_id     = azurerm_user_assigned_identity.agent[k].client_id
      managed_identity_principal_id  = azurerm_user_assigned_identity.agent[k].principal_id
      entra_app_client_id            = azuread_application.agent[k].client_id
      entra_sp_object_id             = azuread_service_principal.agent[k].object_id
      app_insights_connection_string = azurerm_application_insights.agent[k].connection_string
    }
  }
  sensitive = true
}
