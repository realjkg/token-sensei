# ---------------------------------------------------------------------------
# AI plane: Azure AI Foundry hub + project, Azure OpenAI (approved models only,
# Entra-only auth), Azure AI Search for grounding, Azure AI Content Safety.
# Private-endpoint only and public access disabled when enable_private_endpoints
# = true (the secure default); the demo profile sets it false. See azure/COSTS.md.
# ---------------------------------------------------------------------------

# --- supporting storage for the AI Foundry hub ----------------------------
resource "azurerm_storage_account" "ai" {
  name                            = "stinsai${substr(sha1(var.insurance_subscription_id), 0, 8)}"
  location                        = azurerm_resource_group.ai.location
  resource_group_name             = azurerm_resource_group.ai.name
  account_tier                    = "Standard"
  account_replication_type        = "ZRS"
  min_tls_version                 = "TLS1_2"
  public_network_access_enabled   = !var.enable_private_endpoints # deny-ai-public-network-access policy
  allow_nested_items_to_be_public = false
  shared_access_key_enabled       = false
  tags                            = local.common_tags
}

# --- Azure OpenAI account --------------------------------------------------
resource "azurerm_cognitive_account" "openai" {
  name                          = "aoai-insurance-app"
  location                      = azurerm_resource_group.ai.location
  resource_group_name           = azurerm_resource_group.ai.name
  kind                          = "OpenAI"
  sku_name                      = "S0"
  custom_subdomain_name         = "aoai-insurance-app-${substr(sha1(var.insurance_subscription_id), 0, 6)}"
  local_auth_enabled            = false                         # deny-cognitive-services-local-auth policy
  public_network_access_enabled = !var.enable_private_endpoints # deny-ai-public-network-access policy

  identity { type = "SystemAssigned" }

  network_acls {
    default_action = var.enable_private_endpoints ? "Deny" : "Allow"
  }

  tags = local.common_tags
}

resource "azurerm_cognitive_deployment" "approved" {
  for_each             = { for d in var.approved_model_deployments : d.name => d }
  name                 = each.value.name
  cognitive_account_id = azurerm_cognitive_account.openai.id

  model {
    format  = "OpenAI"
    name    = each.value.model
    version = each.value.version
  }

  sku {
    name     = each.value.sku
    capacity = each.value.capacity
  }
}

# --- Azure AI Content Safety ----------------------------------------------
resource "azurerm_cognitive_account" "content_safety" {
  name                          = "acs-insurance-app"
  location                      = azurerm_resource_group.ai.location
  resource_group_name           = azurerm_resource_group.ai.name
  kind                          = "ContentSafety"
  sku_name                      = "S0"
  custom_subdomain_name         = "acs-insurance-app-${substr(sha1(var.insurance_subscription_id), 0, 6)}"
  local_auth_enabled            = false
  public_network_access_enabled = !var.enable_private_endpoints

  identity { type = "SystemAssigned" }

  network_acls { default_action = var.enable_private_endpoints ? "Deny" : "Allow" }
  tags = local.common_tags
}

# Content Safety blocklists and prompt-shield (jailbreak) detection are
# data-plane features of this account, configured by the AI Foundry project /
# the agents at runtime (e.g. an "insurance-default-blocklist" with deny-listed
# terms, plus Prompt Shields enabled on every request). They are not ARM
# resources; provision them from the ALM pipeline against the Content Safety
# endpoint above using the agents' Entra ID auth.

# --- Azure AI Search (grounding) ------------------------------------------
resource "azurerm_search_service" "grounding" {
  name                          = "srch-insurance-app"
  location                      = azurerm_resource_group.ai.location
  resource_group_name           = azurerm_resource_group.ai.name
  sku                           = var.ai_search_sku
  local_authentication_enabled  = false                         # force Entra ID auth
  public_network_access_enabled = !var.enable_private_endpoints # deny-ai-public-network-access policy
  partition_count               = var.ai_search_sku == "free" ? null : var.ai_search_partition_count
  replica_count                 = var.ai_search_sku == "free" ? null : var.ai_search_replica_count

  identity { type = "SystemAssigned" }
  tags = local.common_tags
}

# --- Azure AI Foundry hub + project ---------------------------------------
resource "azurerm_ai_foundry" "hub" {
  name                         = "aif-insurance-app"
  location                     = azurerm_resource_group.ai.location
  resource_group_name          = azurerm_resource_group.ai.name
  storage_account_id           = azurerm_storage_account.ai.id
  key_vault_id                 = azurerm_key_vault.workload.id
  public_network_access        = var.enable_private_endpoints ? "Disabled" : "Enabled"
  high_business_impact_enabled = true

  identity { type = "SystemAssigned" }
  tags = local.common_tags
}

resource "azurerm_ai_foundry_project" "insurance" {
  name               = "proj-insurance-agents"
  location           = azurerm_ai_foundry.hub.location
  ai_services_hub_id = azurerm_ai_foundry.hub.id
  tags               = merge(local.common_tags, { agentName = "shared", agentPurpose = "insurance-agent-platform" })

  identity { type = "SystemAssigned" }
}

# Let the AI Foundry hub use the OpenAI / Search / Content Safety accounts.
resource "azurerm_role_assignment" "hub_openai" {
  scope                = azurerm_cognitive_account.openai.id
  role_definition_name = "Cognitive Services OpenAI Contributor"
  principal_id         = azurerm_ai_foundry.hub.identity[0].principal_id
}

resource "azurerm_role_assignment" "hub_search_contributor" {
  scope                = azurerm_search_service.grounding.id
  role_definition_name = "Search Service Contributor"
  principal_id         = azurerm_ai_foundry.hub.identity[0].principal_id
}

resource "azurerm_role_assignment" "hub_search_data" {
  scope                = azurerm_search_service.grounding.id
  role_definition_name = "Search Index Data Contributor"
  principal_id         = azurerm_ai_foundry.hub.identity[0].principal_id
}

# Diagnostics (policy also enforces).
resource "azurerm_monitor_diagnostic_setting" "openai" {
  name                       = "to-central-law"
  target_resource_id         = azurerm_cognitive_account.openai.id
  log_analytics_workspace_id = var.central_log_analytics_workspace_id
  enabled_log { category_group = "allLogs" }
  enabled_log { category_group = "audit" }
  enabled_metric { category = "AllMetrics" }
}

resource "azurerm_monitor_diagnostic_setting" "search" {
  name                       = "to-central-law"
  target_resource_id         = azurerm_search_service.grounding.id
  log_analytics_workspace_id = var.central_log_analytics_workspace_id
  enabled_log { category = "OperationLogs" }
  enabled_metric { category = "AllMetrics" }
}

resource "azurerm_monitor_diagnostic_setting" "content_safety" {
  name                       = "to-central-law"
  target_resource_id         = azurerm_cognitive_account.content_safety.id
  log_analytics_workspace_id = var.central_log_analytics_workspace_id
  enabled_log { category_group = "allLogs" }
  enabled_metric { category = "AllMetrics" }
}
