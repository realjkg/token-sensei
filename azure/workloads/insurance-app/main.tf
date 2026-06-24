# ---------------------------------------------------------------------------
# Common naming, tags, resource groups.
# ---------------------------------------------------------------------------

locals {
  name_prefix = "insurance-app"

  # Tags required by the ai-agent-governance policy initiative (require-agent-resource-tags).
  governance_tags = {
    agentOwner         = var.agent_owner
    agentPurpose       = "insurance-agent-platform"
    dataClassification = var.data_classification
    expiresOn          = var.expires_on
  }

  common_tags = merge(
    {
      workload    = "insurance-agent-platform"
      iac         = "terraform"
      landingZone = "application-platform"
      managedBy   = "insurance-workload-team"
    },
    local.governance_tags,
    var.extra_tags
  )
}

data "azurerm_client_config" "current" {}

resource "azurerm_resource_group" "workload" {
  name     = "rg-${local.name_prefix}-workload"
  location = var.location
  tags     = local.common_tags
}

resource "azurerm_resource_group" "ai" {
  name     = "rg-${local.name_prefix}-ai"
  location = var.location
  tags     = local.common_tags
}

resource "azurerm_resource_group" "identity" {
  name     = "rg-${local.name_prefix}-identity"
  location = var.location
  tags     = local.common_tags
}
