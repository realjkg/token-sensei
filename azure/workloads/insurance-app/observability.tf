# ---------------------------------------------------------------------------
# Traceability & observability.
#  * One workspace-based Application Insights component per agent, bound to the
#    central Log Analytics workspace -> every agent's telemetry is correlatable
#    in one place by the `agentName` dimension and traceable to its Entra Agent
#    ID / managed identity.
#  * Diagnostic settings for the AI plane / APIM / Key Vault are declared next to
#    each resource; the policy initiative also enforces them.
#  * Microsoft Purview AI audit / DSPM-for-AI hook (optional input).
# ---------------------------------------------------------------------------

resource "azurerm_application_insights" "agent" {
  for_each            = var.agents
  name                = "appi-agent-${each.key}"
  location            = azurerm_resource_group.workload.location
  resource_group_name = azurerm_resource_group.workload.name
  application_type    = "web"
  workspace_id        = var.central_log_analytics_workspace_id
  tags = merge(local.common_tags, {
    agentName    = each.key
    agentPurpose = each.value.purpose
  })
}

# Microsoft Purview hooks (configured in the Purview / compliance portal, not via
# ARM): enable Audit, turn on DSPM for AI, register the AI Foundry project and the
# agents' knowledge sources as data sources, and apply sensitivity labels so that
# prompts/responses, data access, and agent actions are captured and label-aware.
# var.purview_account_id is carried through to outputs so the ALM pipeline can
# target the right account.

# A workbook scaffold that pivots agent telemetry by agentName + identity is
# expected to live alongside the Sentinel content owned by the security team;
# referenced in ../../docs/caf-ai-agent-governance-mapping.md.

output "agent_app_insights" {
  value = { for k in keys(var.agents) : k => azurerm_application_insights.agent[k].id }
}
