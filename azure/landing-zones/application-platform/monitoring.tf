# ---------------------------------------------------------------------------
# Central monitoring + threat protection for the landing zone.
# ---------------------------------------------------------------------------

locals {
  create_workspace = var.central_log_analytics_workspace_id == ""
}

resource "azurerm_resource_group" "monitoring" {
  count    = local.create_workspace ? 1 : 0
  name     = "rg-application-platform-monitoring"
  location = var.location
  tags     = var.platform_tags
}

resource "azurerm_log_analytics_workspace" "central" {
  count               = local.create_workspace ? 1 : 0
  name                = "law-application-platform"
  location            = azurerm_resource_group.monitoring[0].location
  resource_group_name = azurerm_resource_group.monitoring[0].name
  sku                 = "PerGB2018"
  retention_in_days   = var.log_analytics_retention_days
  tags                = var.platform_tags
}

locals {
  central_log_analytics_workspace_id = (
    local.create_workspace
    ? azurerm_log_analytics_workspace.central[0].id
    : var.central_log_analytics_workspace_id
  )
}

# Microsoft Sentinel onto the central workspace (SIEM for agent activity).
resource "azurerm_sentinel_log_analytics_workspace_onboarding" "central" {
  count        = local.create_workspace ? 1 : 0
  workspace_id = local.central_log_analytics_workspace_id
}

# Activity log -> central workspace at the Application Platform MG scope.
resource "azurerm_monitor_diagnostic_setting" "mg_activity" {
  name                       = "to-central-law"
  target_resource_id         = local.application_platform_mg_id
  log_analytics_workspace_id = local.central_log_analytics_workspace_id

  enabled_log { category = "Administrative" }
  enabled_log { category = "Security" }
  enabled_log { category = "Policy" }
}

# Defender for Cloud — AI workloads threat protection (prompt injection /
# anomalous usage) on the insurance workload subscription.
resource "azurerm_security_center_subscription_pricing" "ai" {
  count         = var.enable_defender_ai_threat_protection ? 1 : 0
  provider      = azurerm.workload
  tier          = "Standard"
  resource_type = "AI"
}

resource "azurerm_security_center_subscription_pricing" "key_vaults" {
  provider      = azurerm.workload
  tier          = "Standard"
  resource_type = "KeyVaults"
}

resource "azurerm_security_center_subscription_pricing" "arm" {
  provider      = azurerm.workload
  tier          = "Standard"
  resource_type = "Arm"
}

output "central_log_analytics_workspace_id" {
  value = local.central_log_analytics_workspace_id
}
