# ---------------------------------------------------------------------------
# Platform-side identities for the Application Platform landing zone.
# ---------------------------------------------------------------------------

# Managed identity used by the AI-agent governance policy initiative for
# deployIfNotExists / modify remediation tasks (see ../policy-as-code).
resource "azurerm_resource_group" "platform_identity" {
  name     = "rg-application-platform-identity"
  location = var.location
  tags     = var.platform_tags
}

resource "azurerm_user_assigned_identity" "policy_remediation" {
  name                = "id-ai-agent-policy-remediation"
  location            = azurerm_resource_group.platform_identity.location
  resource_group_name = azurerm_resource_group.platform_identity.name
  tags                = var.platform_tags
}

# Grant the remediation identity the rights it needs at the Application Platform MG.
resource "azurerm_role_assignment" "policy_remediation_contributor" {
  scope                = local.application_platform_mg_id
  role_definition_name = "Contributor"
  principal_id         = azurerm_user_assigned_identity.policy_remediation.principal_id
}

resource "azurerm_role_assignment" "policy_remediation_monitoring" {
  scope                = local.application_platform_mg_id
  role_definition_name = "Monitoring Contributor"
  principal_id         = azurerm_user_assigned_identity.policy_remediation.principal_id
}

# Entra security group that every agent identity is placed into. This is the
# Conditional Access target ("CA-AI-Agents-Restrict") that blocks legacy auth,
# blocks interactive sign-in, and pins agents to named locations.
resource "azuread_group" "ai_agents" {
  display_name     = var.ai_agents_group_name
  description      = "All AI agent workload identities (Entra Agent ID / managed identities). Conditional Access target. Reviewed quarterly."
  security_enabled = true

  lifecycle {
    # Members are managed by the workload module as agents come and go.
    ignore_changes = [members]
  }
}

output "policy_remediation_identity_id" {
  value = azurerm_user_assigned_identity.policy_remediation.id
}

output "policy_remediation_identity_principal_id" {
  value = azurerm_user_assigned_identity.policy_remediation.principal_id
}

output "ai_agents_group_object_id" {
  value = azuread_group.ai_agents.object_id
}
