# ---------------------------------------------------------------------------
# Profile: dev-demo  ->  azure/workloads/insurance-app
# ~$80-150/month idle. PUBLIC endpoints, no VNet — NON-SENSITIVE demo data only.
# Replace the placeholder IDs below via a separate gitignored ids.tfvars / -var.
#
# IMPORTANT: this profile uses public endpoints. If you ALSO deploy azure/policy-as-code,
#    assign the initiative with `-var enforcement_mode=DoNotEnforce` (or skip the
#    policy module) — otherwise deny-ai-public-network-access /
#    deny-cognitive-services-local-auth will BLOCK this apply. See azure/README.md
#    "Sandbox quickstart".
# ---------------------------------------------------------------------------

# --- placeholders: override these --------------------------------------------
insurance_subscription_id          = "00000000-0000-0000-0000-000000000000"
central_log_analytics_workspace_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-application-platform-monitoring/providers/Microsoft.OperationalInsights/workspaces/law-application-platform"
ai_agents_group_object_id          = "00000000-0000-0000-0000-000000000000"
# No spoke network in a demo; leave empty (enable_* toggles below are false):
spoke_subnet_ids = {}

# --- cost / network posture -------------------------------------------------
location                   = "eastus2"
enable_private_endpoints   = false # public endpoints (demo only!)
enable_vnet_injection      = false # no Power Platform VNet injection; APIM not Internal
key_vault_purge_protection = false # so you can tear down + redeploy the same name

# Cheapest connector gateway: serverless, pay-per-call. (Consumption SKU cannot
# do Internal VNet, which is fine here since enable_vnet_injection=false.)
apim_sku_name = "Consumption_0"

# Cheapest grounding search: Basic tier, single unit. (Use "free" for $0 / 3
# indexes if you don't need an SLA at all.)
ai_search_sku             = "basic"
ai_search_replica_count   = 1
ai_search_partition_count = 1

purview_account_id = "" # skip Purview in a demo
cicd_github_repo   = "" # skip workload-identity federation in a demo

# --- one environment, one agent ---------------------------------------------
power_platform_location = "unitedstates"
power_platform_environments = {
  "insurance-demo" = { environment_type = "Sandbox", description = "Insurance agent platform - demo" }
}
maker_sharing_limit = 20

agents = {
  "claims-triage-agent" = {
    purpose              = "First-notice-of-loss triage and routing (demo)"
    needs_openai         = true
    needs_search         = true
    needs_content_safety = true
  }
}

# Just the small/cheap models for a demo.
approved_model_deployments = [
  { name = "gpt-4o-mini", model = "gpt-4o-mini", version = "2024-07-18", capacity = 10 },
  { name = "text-embedding-3-large", model = "text-embedding-3-large", version = "1", capacity = 10 },
]

agent_owner         = "demo-team@adapt.example"
data_classification = "Internal"
expires_on          = "2026-09-30"

apim_publisher_name  = "Adapt Insurance Platform (demo)"
apim_publisher_email = "demo-team@adapt.example"
