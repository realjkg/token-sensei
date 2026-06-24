# ---------------------------------------------------------------------------
# Profile: prod  ->  azure/workloads/insurance-app
# ~$3,500-6,000+/month idle (APIM Premium + AI Search S1 multi-replica + private
# endpoints dominate). Private-endpoint only, Internal-VNet APIM, all four
# agents, policies enforced (Deny / DeployIfNotExists).
# Replace the placeholder IDs below via a separate gitignored ids.tfvars / -var.
# ---------------------------------------------------------------------------

# --- placeholders: override these --------------------------------------------
insurance_subscription_id          = "11111111-1111-1111-1111-111111111111"
central_log_analytics_workspace_id = "/subscriptions/.../resourceGroups/rg-application-platform-monitoring/providers/Microsoft.OperationalInsights/workspaces/law-application-platform"
ai_agents_group_object_id          = "33333333-3333-3333-3333-333333333333"
spoke_subnet_ids = {
  private_endpoints = "/subscriptions/.../resourceGroups/rg-insurance-app-network/providers/Microsoft.Network/virtualNetworks/vnet-insurance-app/subnets/snet-privateendpoints"
  power_platform    = "/subscriptions/.../resourceGroups/rg-insurance-app-network/providers/Microsoft.Network/virtualNetworks/vnet-insurance-app/subnets/snet-powerplatform"
  apim              = "/subscriptions/.../resourceGroups/rg-insurance-app-network/providers/Microsoft.Network/virtualNetworks/vnet-insurance-app/subnets/snet-apim"
  workload_compute  = "/subscriptions/.../resourceGroups/rg-insurance-app-network/providers/Microsoft.Network/virtualNetworks/vnet-insurance-app/subnets/snet-workload-compute"
}

# --- cost / network posture -------------------------------------------------
location                   = "eastus2"
enable_private_endpoints   = true
enable_vnet_injection      = true
key_vault_purge_protection = true

# Premium = Internal VNet + availability zones + multi-region. Bump the unit
# count (Premium_2, Premium_3, ...) for more throughput / more zones.
apim_sku_name = "Premium_1"

# Standard (S1) search with query+indexing SLA (3 replicas). Scale partitions
# with index size.
ai_search_sku             = "standard"
ai_search_replica_count   = 3
ai_search_partition_count = 1

purview_account_id = "/subscriptions/.../resourceGroups/rg-purview/providers/Microsoft.Purview/accounts/purview-adapt"
cicd_github_repo   = "realjkg/adaptcloud"

# --- dev / test / prod environments + all four agents -----------------------
power_platform_location = "unitedstates"
power_platform_environments = {
  "insurance-dev"  = { environment_type = "Sandbox", description = "Insurance agent platform - development" }
  "insurance-test" = { environment_type = "Sandbox", description = "Insurance agent platform - test/UAT" }
  "insurance-prod" = { environment_type = "Production", description = "Insurance agent platform - production" }
}
maker_sharing_limit = 20

agents = {
  "policy-intake-agent" = {
    purpose              = "Quote intake and policy document understanding"
    needs_openai         = true
    needs_search         = true
    needs_content_safety = true
    federated_subjects   = ["repo:realjkg/adaptcloud:environment:insurance-prod"]
  }
  "claims-triage-agent" = {
    purpose              = "First-notice-of-loss triage and routing"
    needs_openai         = true
    needs_search         = true
    needs_content_safety = true
  }
  "underwriting-copilot" = {
    purpose              = "Underwriter assistant: risk summarisation and pricing guidance"
    needs_openai         = true
    needs_search         = true
    needs_content_safety = true
  }
  "fraud-signal-agent" = {
    purpose              = "Claims fraud-signal detection and case annotation"
    needs_openai         = true
    needs_search         = false
    needs_content_safety = true
  }
}

approved_model_deployments = [
  { name = "gpt-4o", model = "gpt-4o", version = "2024-11-20", capacity = 30 },
  { name = "gpt-4o-mini", model = "gpt-4o-mini", version = "2024-07-18", capacity = 30 },
  { name = "text-embedding-3-large", model = "text-embedding-3-large", version = "1", capacity = 30 },
]

agent_owner         = "insurance-engineering@adapt.example"
data_classification = "Confidential"
expires_on          = "2026-12-31"

apim_publisher_name  = "Adapt Insurance Platform"
apim_publisher_email = "platform@adapt.example"
