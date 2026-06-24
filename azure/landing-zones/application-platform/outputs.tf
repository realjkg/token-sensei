# Aggregated outputs consumed by ../policy-as-code and ../workloads/insurance-app.

output "landing_zone_summary" {
  description = "Key identifiers for downstream modules."
  value = {
    application_platform_mg_id      = local.application_platform_mg_id
    application_platform_mg_created = var.create_application_platform_mg
    insurance_subscription_id       = local.insurance_subscription_id
    platform_private_dns_zone_ids   = var.platform_private_dns_zone_ids
    spoke_vnet_id                   = azurerm_virtual_network.spoke.id
    subnet_ids = {
      private_endpoints = azurerm_subnet.private_endpoints.id
      power_platform    = azurerm_subnet.power_platform.id
      apim              = azurerm_subnet.apim.id
      workload_compute  = azurerm_subnet.workload_compute.id
    }
    central_log_analytics_workspace_id = local.central_log_analytics_workspace_id
    policy_remediation_identity_id     = azurerm_user_assigned_identity.policy_remediation.id
    ai_agents_group_object_id          = azuread_group.ai_agents.object_id
  }
}
