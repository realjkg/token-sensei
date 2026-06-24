output "workload_summary" {
  description = "Key identifiers for the insurance agent platform workload."
  value = {
    resource_groups = {
      workload = azurerm_resource_group.workload.name
      ai       = azurerm_resource_group.ai.name
      identity = azurerm_resource_group.identity.name
    }
    openai_endpoint             = azurerm_cognitive_account.openai.endpoint
    openai_account_id           = azurerm_cognitive_account.openai.id
    search_service_id           = azurerm_search_service.grounding.id
    content_safety_endpoint     = azurerm_cognitive_account.content_safety.endpoint
    ai_foundry_hub_id           = azurerm_ai_foundry.hub.id
    ai_foundry_project_id       = azurerm_ai_foundry_project.insurance.id
    key_vault_uri               = azurerm_key_vault.workload.vault_uri
    apim_gateway_url            = azurerm_api_management.connectors.gateway_url
    power_platform_environments = { for k, v in powerplatform_environment.this : k => v.id }
    model_deployments           = [for d in var.approved_model_deployments : d.name]
    purview_account_id          = var.purview_account_id
  }
}

output "governance_notes" {
  description = "Reminders for the steps that finish outside Terraform."
  value = [
    "Create the 'CA-AI-Agents-Restrict' Conditional Access policy in Entra targeting the ai-agents group (block legacy auth, block interactive sign-in, restrict to named locations).",
    "Run an Entra access review over the ai-agents group quarterly; disable then delete agents with no owner or past their expiresOn tag.",
    "Associate the Power Platform VNet enterprise policy with each insurance environment from the ALM pipeline.",
    "Export the APIM APIs to Power Platform as custom connectors from the ALM pipeline.",
    "Enable Microsoft Purview DSPM for AI and apply sensitivity labels to the agents' knowledge sources.",
    "Confirm the ai-agent-governance policy initiative is assigned at the Application Platform management group and reports compliant."
  ]
}
