# ---------------------------------------------------------------------------
# Workload Key Vault — RBAC mode, purge protection, NO public access, private
# endpoint. Holds only the unavoidable secrets (partner API keys consumed via
# APIM). Agents never read raw secrets except via the scoped "Key Vault Secrets
# User" role granted in identity-agents.tf.
# ---------------------------------------------------------------------------

resource "azurerm_key_vault" "workload" {
  name                = "kv-insurance-app-${substr(sha1(var.insurance_subscription_id), 0, 6)}"
  location            = azurerm_resource_group.workload.location
  resource_group_name = azurerm_resource_group.workload.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  rbac_authorization_enabled    = true
  purge_protection_enabled      = var.key_vault_purge_protection
  soft_delete_retention_days    = var.key_vault_purge_protection ? 90 : 7
  public_network_access_enabled = !var.enable_private_endpoints # required by deny-ai-public-network-access policy

  network_acls {
    default_action = var.enable_private_endpoints ? "Deny" : "Allow"
    bypass         = "AzureServices"
  }

  tags = local.common_tags
}

resource "azurerm_private_endpoint" "key_vault" {
  count               = var.enable_private_endpoints ? 1 : 0
  name                = "pe-kv-insurance-app"
  location            = azurerm_resource_group.workload.location
  resource_group_name = azurerm_resource_group.workload.name
  subnet_id           = var.spoke_subnet_ids["private_endpoints"]
  tags                = local.common_tags

  private_service_connection {
    name                           = "psc-kv-insurance-app"
    private_connection_resource_id = azurerm_key_vault.workload.id
    subresource_names              = ["vault"]
    is_manual_connection           = false
  }
}

# Diagnostics -> central workspace (the policy also enforces this; declaring it
# here avoids a remediation lag).
resource "azurerm_monitor_diagnostic_setting" "key_vault" {
  name                       = "to-central-law"
  target_resource_id         = azurerm_key_vault.workload.id
  log_analytics_workspace_id = var.central_log_analytics_workspace_id

  enabled_log { category = "AuditEvent" }
  enabled_log { category = "AzurePolicyEvaluationDetails" }
  enabled_metric { category = "AllMetrics" }
}
