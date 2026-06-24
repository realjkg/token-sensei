# ---------------------------------------------------------------------------
# Profile: prod  ->  azure/landing-zones/application-platform
# Production posture. Pair with profiles/prod/insurance-app.tfvars.
# Replace the placeholder IDs below via a separate gitignored ids.tfvars / -var.
# ---------------------------------------------------------------------------

# --- placeholders: override these --------------------------------------------
platform_management_subscription_id = "00000000-0000-0000-0000-000000000000"
insurance_subscription_id           = "11111111-1111-1111-1111-111111111111"
tenant_root_management_group_id     = "22222222-2222-2222-2222-222222222222"

# Real connectivity-hub references (required for private endpoints + VNet injection):
hub_vnet_id             = "/subscriptions/.../resourceGroups/rg-hub-network/providers/Microsoft.Network/virtualNetworks/vnet-hub"
hub_firewall_private_ip = "10.0.1.4"
platform_private_dns_zone_ids = {
  "privatelink.openai.azure.com"            = "/subscriptions/.../resourceGroups/rg-hub-dns/providers/Microsoft.Network/privateDnsZones/privatelink.openai.azure.com"
  "privatelink.cognitiveservices.azure.com" = "/subscriptions/.../resourceGroups/rg-hub-dns/providers/Microsoft.Network/privateDnsZones/privatelink.cognitiveservices.azure.com"
  "privatelink.search.windows.net"          = "/subscriptions/.../resourceGroups/rg-hub-dns/providers/Microsoft.Network/privateDnsZones/privatelink.search.windows.net"
  "privatelink.vaultcore.azure.net"         = "/subscriptions/.../resourceGroups/rg-hub-dns/providers/Microsoft.Network/privateDnsZones/privatelink.vaultcore.azure.net"
  "privatelink.blob.core.windows.net"       = "/subscriptions/.../resourceGroups/rg-hub-dns/providers/Microsoft.Network/privateDnsZones/privatelink.blob.core.windows.net"
  "privatelink.azure-api.net"               = "/subscriptions/.../resourceGroups/rg-hub-dns/providers/Microsoft.Network/privateDnsZones/privatelink.azure-api.net"
  "privatelink.api.azureml.ms"              = "/subscriptions/.../resourceGroups/rg-hub-dns/providers/Microsoft.Network/privateDnsZones/privatelink.api.azureml.ms"
  "privatelink.notebooks.azure.net"         = "/subscriptions/.../resourceGroups/rg-hub-dns/providers/Microsoft.Network/privateDnsZones/privatelink.notebooks.azure.net"
}

# --- posture ----------------------------------------------------------------
location = "eastus2"

# Set create_application_platform_mg = false if your tenant already has an
# Application Platform landing zone; otherwise leave true to create it.
create_application_platform_mg = true
application_platform_mg_name   = "alz-application-platform"
platform_landing_zones_mg_id   = "/providers/Microsoft.Management/managementGroups/alz-landingzones"

# Monitoring: reuse the platform Log Analytics workspace if you have one;
# otherwise a 90-day workspace is created. Defender AI threat protection ON.
central_log_analytics_workspace_id   = "" # e.g. "/subscriptions/.../workspaces/law-platform-prod"
log_analytics_retention_days         = 90
enable_defender_ai_threat_protection = true

# Subnet sizing for a prod spoke (override if it collides with your address plan):
spoke_address_space = ["10.40.0.0/22"]

billing_scope_id = "" # only needed when vending a brand-new subscription
