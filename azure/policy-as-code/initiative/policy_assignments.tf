# ---------------------------------------------------------------------------
# Publishes the AI-agent governance policy definitions + initiative at the
# Application Platform management group and assigns the initiative there.
# ---------------------------------------------------------------------------

locals {
  definitions_dir = "${path.module}/../definitions"

  # name (in ARM) => source JSON file
  policy_files = {
    "aiagent-allowed-locations"      = "allowed-ai-locations.json"
    "aiagent-allowed-aoai-models"    = "allowed-aoai-model-deployments.json"
    "aiagent-deny-public-network"    = "deny-ai-public-network-access.json"
    "aiagent-deny-local-auth"        = "deny-cognitive-services-local-auth.json"
    "aiagent-audit-managed-identity" = "audit-managed-identity-on-agents.json"
    "aiagent-require-diagnostics"    = "require-diagnostic-settings-ai.json"
    "aiagent-require-tags"           = "require-agent-resource-tags.json"
  }
}

resource "azurerm_policy_definition" "this" {
  for_each = local.policy_files

  name                = each.key
  management_group_id = var.management_group_id

  policy_type  = "Custom"
  mode         = jsondecode(file("${local.definitions_dir}/${each.value}")).properties.mode
  display_name = jsondecode(file("${local.definitions_dir}/${each.value}")).properties.displayName
  description  = jsondecode(file("${local.definitions_dir}/${each.value}")).properties.description
  metadata     = jsonencode(jsondecode(file("${local.definitions_dir}/${each.value}")).properties.metadata)
  parameters   = jsonencode(jsondecode(file("${local.definitions_dir}/${each.value}")).properties.parameters)
  policy_rule  = jsonencode(jsondecode(file("${local.definitions_dir}/${each.value}")).properties.policyRule)
}

resource "azurerm_policy_set_definition" "ai_agent_governance" {
  name                = "aiagent-governance"
  policy_type         = "Custom"
  display_name        = "AI agent governance (insurance agent platform)"
  description         = "CAF AI-agent governance guardrails: constrained regions, approved models only, no public network access, no local auth, managed identity on agent hosts, diagnostics to central Log Analytics, ownership/classification tagging."
  management_group_id = var.management_group_id

  metadata = jsonencode({
    category = "AI agent governance"
    version  = "1.0.0"
  })

  parameters = jsonencode({
    allowedLocations        = { type = "Array", defaultValue = var.allowed_locations }
    allowedModelNames       = { type = "Array", defaultValue = var.allowed_aoai_model_names }
    requiredTagNames        = { type = "Array", defaultValue = var.required_tag_names }
    logAnalyticsWorkspaceId = { type = "String" }
  })

  policy_definition_reference {
    reference_id         = "allowedAiLocations"
    policy_definition_id = azurerm_policy_definition.this["aiagent-allowed-locations"].id
    parameter_values = jsonencode({
      allowedLocations = { value = "[parameters('allowedLocations')]" }
      effect           = { value = "Deny" }
    })
  }

  policy_definition_reference {
    reference_id         = "allowedAoaiModels"
    policy_definition_id = azurerm_policy_definition.this["aiagent-allowed-aoai-models"].id
    parameter_values = jsonencode({
      allowedModelNames = { value = "[parameters('allowedModelNames')]" }
      effect            = { value = "Deny" }
    })
  }

  policy_definition_reference {
    reference_id         = "denyAiPublicNetwork"
    policy_definition_id = azurerm_policy_definition.this["aiagent-deny-public-network"].id
    parameter_values = jsonencode({
      effect = { value = "Deny" }
    })
  }

  policy_definition_reference {
    reference_id         = "denyCognitiveLocalAuth"
    policy_definition_id = azurerm_policy_definition.this["aiagent-deny-local-auth"].id
    parameter_values = jsonencode({
      effect = { value = "Deny" }
    })
  }

  policy_definition_reference {
    reference_id         = "auditManagedIdentityOnAgents"
    policy_definition_id = azurerm_policy_definition.this["aiagent-audit-managed-identity"].id
    parameter_values = jsonencode({
      effect = { value = "Audit" }
    })
  }

  policy_definition_reference {
    reference_id         = "requireDiagnosticsAi"
    policy_definition_id = azurerm_policy_definition.this["aiagent-require-diagnostics"].id
    parameter_values = jsonencode({
      logAnalyticsWorkspaceId = { value = "[parameters('logAnalyticsWorkspaceId')]" }
      effect                  = { value = "DeployIfNotExists" }
    })
  }

  policy_definition_reference {
    reference_id         = "requireAgentTags"
    policy_definition_id = azurerm_policy_definition.this["aiagent-require-tags"].id
    parameter_values = jsonencode({
      requiredTagNames = { value = "[parameters('requiredTagNames')]" }
      effect           = { value = "Deny" }
    })
  }
}

resource "azurerm_management_group_policy_assignment" "ai_agent_governance" {
  name                 = "aiagent-governance"
  display_name         = "AI agent governance (insurance agent platform)"
  description          = "Assigned per CAF 'Govern and secure AI agents across your organization'. deployIfNotExists/modify effects use a platform-managed user-assigned identity."
  policy_definition_id = azurerm_policy_set_definition.ai_agent_governance.id
  management_group_id  = var.management_group_id
  enforce              = var.enforcement_mode == "Default"
  location             = var.remediation_identity_location

  identity {
    type         = "UserAssigned"
    identity_ids = [var.policy_remediation_identity_id]
  }

  parameters = jsonencode({
    allowedLocations        = { value = var.allowed_locations }
    allowedModelNames       = { value = var.allowed_aoai_model_names }
    requiredTagNames        = { value = var.required_tag_names }
    logAnalyticsWorkspaceId = { value = var.central_log_analytics_workspace_id }
  })

  non_compliance_message {
    content = "This resource violates the AI agent governance baseline (region, model, public network, local auth, managed identity, diagnostics, or required tags). See azure/policy-as-code/README.md."
  }
}

# Break-glass exemption hook — left empty by default; populate with a scope and a
# justification when a genuine, time-boxed exception is approved.
# resource "azurerm_management_group_policy_exemption" "break_glass" {
#   name                 = "aiagent-governance-breakglass"
#   management_group_id  = var.management_group_id
#   policy_assignment_id = azurerm_management_group_policy_assignment.ai_agent_governance.id
#   exemption_category   = "Waiver"
#   expires_on           = "2026-12-31T00:00:00Z"
#   description          = "Approved exception <ticket-id> - <reason>."
# }

output "initiative_id" {
  value = azurerm_policy_set_definition.ai_agent_governance.id
}

output "assignment_id" {
  value = azurerm_management_group_policy_assignment.ai_agent_governance.id
}
