# ---------------------------------------------------------------------------
# Insurance-app Application landing zone — subscription association / vending.
#
# Either move an existing subscription under the Application Platform MG, or vend
# a brand-new one from the billing scope. Apply platform tags + a budget.
# ---------------------------------------------------------------------------

locals {
  vend_new_subscription = var.insurance_subscription_id == "" && var.billing_scope_id != ""
}

resource "azurerm_subscription" "insurance" {
  count             = local.vend_new_subscription ? 1 : 0
  subscription_name = "sub-insurance-agent-platform-prod"
  billing_scope_id  = var.billing_scope_id
  alias             = "insurance-agent-platform-prod"
  tags              = var.platform_tags
}

locals {
  insurance_subscription_id = (
    local.vend_new_subscription
    ? azurerm_subscription.insurance[0].subscription_id
    : var.insurance_subscription_id
  )
  insurance_subscription_resource_id = "/subscriptions/${local.insurance_subscription_id}"
}

# Place the workload subscription under the Application Platform MG.
resource "azurerm_management_group_subscription_association" "insurance" {
  management_group_id = local.application_platform_mg_id
  subscription_id     = local.insurance_subscription_resource_id
}

# Guardrail budget on the workload subscription.
resource "azurerm_consumption_budget_subscription" "insurance" {
  name            = "budget-insurance-agent-platform"
  subscription_id = local.insurance_subscription_resource_id
  amount          = 5000
  time_grain      = "Monthly"

  time_period {
    start_date = formatdate("YYYY-MM-01'T'00:00:00'Z'", timestamp())
  }

  notification {
    enabled        = true
    threshold      = 80
    operator       = "GreaterThanOrEqualTo"
    threshold_type = "Actual"
    contact_roles  = ["Owner", "Contributor"]
  }

  notification {
    enabled        = true
    threshold      = 100
    operator       = "GreaterThanOrEqualTo"
    threshold_type = "Forecasted"
    contact_roles  = ["Owner"]
  }

  lifecycle {
    ignore_changes = [time_period]
  }
}

output "insurance_subscription_id" {
  description = "Subscription ID hosting the insurance-app Application landing zone."
  value       = local.insurance_subscription_id
}
