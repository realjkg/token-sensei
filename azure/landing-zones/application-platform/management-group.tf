# ---------------------------------------------------------------------------
# Application Platform management group — create-or-reference.
#
# CAF: agent workloads must sit in an Application landing zone under an
# "Application Platform" management group. If your tenant does not have one yet,
# leave var.create_application_platform_mg = true (the default) and this creates
# it. If it already exists, set the var to false and supply its name; we just
# reference it.
# ---------------------------------------------------------------------------

locals {
  # Parent MG: the platform "Landing Zones" MG if supplied, else the tenant root.
  application_platform_parent_id = (
    var.platform_landing_zones_mg_id != ""
    ? var.platform_landing_zones_mg_id
    : "/providers/Microsoft.Management/managementGroups/${var.tenant_root_management_group_id}"
  )
}

resource "azurerm_management_group" "application_platform" {
  count                      = var.create_application_platform_mg ? 1 : 0
  name                       = var.application_platform_mg_name
  display_name               = var.application_platform_mg_display_name
  parent_management_group_id = local.application_platform_parent_id

  lifecycle {
    # Don't claw back subscriptions associated out of band (e.g. by subscription_association below).
    ignore_changes = [subscription_ids]
  }
}

data "azurerm_management_group" "application_platform" {
  count = var.create_application_platform_mg ? 0 : 1
  name  = var.application_platform_mg_name
}

locals {
  application_platform_mg_id = (
    var.create_application_platform_mg
    ? azurerm_management_group.application_platform[0].id
    : data.azurerm_management_group.application_platform[0].id
  )
}

output "application_platform_mg_id" {
  description = "Resource ID of the Application Platform management group (created here, or referenced)."
  value       = local.application_platform_mg_id
}

output "application_platform_mg_created" {
  description = "True if this run created the Application Platform management group."
  value       = var.create_application_platform_mg
}
