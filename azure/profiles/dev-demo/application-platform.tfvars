# ---------------------------------------------------------------------------
# Profile: dev-demo  ->  azure/landing-zones/application-platform
# Cheapest viable footprint. Pair with profiles/dev-demo/insurance-app.tfvars.
# Replace the placeholder IDs below via a separate gitignored ids.tfvars / -var.
# ---------------------------------------------------------------------------

# --- placeholders: override these --------------------------------------------
platform_management_subscription_id = "00000000-0000-0000-0000-000000000000"
insurance_subscription_id           = "00000000-0000-0000-0000-000000000000"
tenant_root_management_group_id     = "00000000-0000-0000-0000-000000000000"
# A demo doesn't need a real connectivity hub; these are unused when the
# workload profile sets enable_private_endpoints=false / enable_vnet_injection=false,
# but the variables are still required by the module, so leave dummies:
hub_vnet_id                   = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/none/providers/Microsoft.Network/virtualNetworks/none"
hub_firewall_private_ip       = "10.0.0.4"
platform_private_dns_zone_ids = {}

# --- posture ----------------------------------------------------------------
location                       = "eastus2"
create_application_platform_mg = true # demo: create a throwaway MG you can delete after
application_platform_mg_name   = "alz-application-platform-demo"
platform_landing_zones_mg_id   = "" # nest under tenant root for a demo

# Cheap monitoring: short retention, no Defender AI plan, no separate workspace
# unless you want one.
central_log_analytics_workspace_id   = "" # creates a small workspace in the platform sub
log_analytics_retention_days         = 30
enable_defender_ai_threat_protection = false

billing_scope_id = "" # only needed when vending a brand-new subscription
