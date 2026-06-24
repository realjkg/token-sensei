# ---------------------------------------------------------------------------
# API connectors plane: Azure API Management (internal VNet mode) fronting the
# bespoke insurance APIs. APIM gives us throttling, Entra ID validation,
# logging, and a single governed host that the DLP policy whitelists for custom
# connectors. The OpenAPI specs in ./connectors/ are imported as APIM APIs and
# can be one-click "Export to Power Platform" as custom connectors.
# ---------------------------------------------------------------------------

resource "azurerm_api_management" "connectors" {
  name                = "apim-insurance-app"
  location            = azurerm_resource_group.workload.location
  resource_group_name = azurerm_resource_group.workload.name
  publisher_name      = var.apim_publisher_name
  publisher_email     = var.apim_publisher_email
  sku_name            = var.apim_sku_name # Developer_1 (non-prod) | StandardV2_1 | Premium_1 (prod, VNet+zones) | Consumption_0 (serverless demo)

  # Internal VNet mode when enable_vnet_injection = true; "None" otherwise (and
  # for the Consumption SKU, which does not support VNet integration).
  virtual_network_type = var.enable_vnet_injection ? "Internal" : "None"

  dynamic "virtual_network_configuration" {
    for_each = var.enable_vnet_injection ? [1] : []
    content {
      subnet_id = var.spoke_subnet_ids["apim"]
    }
  }

  identity { type = "SystemAssigned" }
  tags = local.common_tags
}

# Validate the caller's Entra ID token on every request — agents call APIM with
# their managed identity / Entra Agent ID token, never an API key.
resource "azurerm_api_management_named_value" "tenant_id" {
  name                = "tenant-id"
  resource_group_name = azurerm_resource_group.workload.name
  api_management_name = azurerm_api_management.connectors.name
  display_name        = "tenant-id"
  value               = data.azurerm_client_config.current.tenant_id
}

# Let APIM's managed identity read secrets from the workload Key Vault, so
# partner API keys (the few unavoidable secrets) can be wired as Key-Vault-backed
# named values instead of being committed to source. Create one
# `azurerm_api_management_named_value` per partner secret with a
# `value_from_key_vault { secret_id = "${azurerm_key_vault.workload.vault_uri}secrets/<name>" }`
# block once the secret exists in the vault (populated out of band / by the ALM
# pipeline).
resource "azurerm_role_assignment" "apim_keyvault" {
  scope                = azurerm_key_vault.workload.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_api_management.connectors.identity[0].principal_id
}

# Tenant-wide inbound policy: require a valid Entra ID JWT.
resource "azurerm_api_management_policy" "global" {
  api_management_id = azurerm_api_management.connectors.id
  depends_on        = [azurerm_api_management_named_value.tenant_id]
  xml_content       = <<-XML
    <policies>
      <inbound>
        <validate-azure-ad-token tenant-id="{{tenant-id}}">
          <audiences>
            <audience>api://insurance-app-connectors</audience>
          </audiences>
        </validate-azure-ad-token>
        <rate-limit calls="600" renewal-period="60" />
      </inbound>
      <backend><forward-request /></backend>
      <outbound />
      <on-error />
    </policies>
  XML
}

# --- import the bespoke insurance APIs from the OpenAPI specs --------------
locals {
  bespoke_apis = {
    "insurance-policy-api" = {
      path         = "policy"
      display_name = "Insurance Policy API"
      spec_file    = "${path.module}/connectors/insurance-policy-api.openapi.yaml"
    }
    "claims-api" = {
      path         = "claims"
      display_name = "Claims API"
      spec_file    = "${path.module}/connectors/claims-api.openapi.yaml"
    }
  }
}

resource "azurerm_api_management_api" "bespoke" {
  for_each              = local.bespoke_apis
  name                  = each.key
  resource_group_name   = azurerm_resource_group.workload.name
  api_management_name   = azurerm_api_management.connectors.name
  revision              = "1"
  display_name          = each.value.display_name
  path                  = each.value.path
  protocols             = ["https"]
  subscription_required = false # auth is Entra ID JWT, not subscription keys

  import {
    content_format = "openapi"
    content_value  = file(each.value.spec_file)
  }
}

resource "azurerm_application_insights" "apim" {
  name                = "appi-apim-insurance-app"
  location            = azurerm_resource_group.workload.location
  resource_group_name = azurerm_resource_group.workload.name
  application_type    = "web"
  workspace_id        = var.central_log_analytics_workspace_id
  tags                = local.common_tags
}

# Log every APIM request to Application Insights (which is workspace-based, so it
# also lands in the central Log Analytics workspace). Diagnostics below are also
# enforced by the ai-agent-governance policy initiative.
resource "azurerm_api_management_logger" "appinsights" {
  name                = "appinsights"
  api_management_name = azurerm_api_management.connectors.name
  resource_group_name = azurerm_resource_group.workload.name
  resource_id         = azurerm_application_insights.apim.id

  application_insights {
    connection_string = azurerm_application_insights.apim.connection_string
  }
}

resource "azurerm_monitor_diagnostic_setting" "apim" {
  name                       = "to-central-law"
  target_resource_id         = azurerm_api_management.connectors.id
  log_analytics_workspace_id = var.central_log_analytics_workspace_id
  enabled_log { category = "GatewayLogs" }
  enabled_log { category = "WebSocketConnectionLogs" }
  enabled_metric { category = "AllMetrics" }
}

# NOTE on custom connectors: once APIM is up, run "APIM -> API -> Export ->
# Power Platform: Power Automate / Power Apps" (or the equivalent
# az apim api ... / solution import) to publish each API as a governed custom
# connector into the insurance environments. The DLP policy already restricts
# custom connectors to `apim-insurance-app.azure-api.net`, so no other custom
# connector can be created. This step lives in the ALM pipeline.

output "apim_gateway_url" {
  value = azurerm_api_management.connectors.gateway_url
}
