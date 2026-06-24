variable "platform_management_subscription_id" {
  description = "Subscription ID of the platform management subscription (where Terraform authenticates and where the central Log Analytics workspace lives if you create one here)."
  type        = string
}

variable "insurance_subscription_id" {
  description = "Subscription ID for the insurance-app Application landing zone. This subscription is moved under the Application Platform management group. Leave empty to vend a new one (requires var.billing_scope_id)."
  type        = string
  default     = ""
}

variable "billing_scope_id" {
  description = "EA/MCA billing scope used to vend a new subscription when insurance_subscription_id is empty. Example: /providers/Microsoft.Billing/billingAccounts/xxxx/billingProfiles/yyyy/invoiceSections/zzzz."
  type        = string
  default     = ""
}

variable "location" {
  description = "Primary Azure region for the landing zone (must be in the policy allow-list)."
  type        = string
  default     = "eastus2"
}

variable "tenant_root_management_group_id" {
  description = "Tenant root management group ID (the tenant ID), used as a fallback parent if the platform Landing Zones MG is not supplied."
  type        = string
}

variable "platform_landing_zones_mg_id" {
  description = "Resource ID of the existing platform 'Landing Zones' management group to nest the Application Platform MG under. If empty, the Application Platform MG is created directly under the tenant root."
  type        = string
  default     = ""
}

variable "create_application_platform_mg" {
  description = "If true (default), create the Application Platform management group — i.e. you don't have an Application Platform landing zone yet. Set to false to reference an existing one by name."
  type        = bool
  default     = true
}

variable "application_platform_mg_name" {
  description = "Name (ID) of the Application Platform management group to create or reference."
  type        = string
  default     = "alz-application-platform"
}

variable "application_platform_mg_display_name" {
  description = "Display name for the Application Platform management group."
  type        = string
  default     = "Application Platform"
}

# ---------------------------------------------------------------------------
# Connectivity hub references (platform-owned)
# ---------------------------------------------------------------------------
variable "hub_vnet_id" {
  description = "Resource ID of the connectivity hub VNet to peer the workload spoke with."
  type        = string
}

variable "hub_firewall_private_ip" {
  description = "Private IP of the hub Azure Firewall; used as the next hop for the spoke's default route."
  type        = string
}

variable "platform_private_dns_zone_ids" {
  description = "Map of Private DNS zone name => resource ID for the PaaS the workload uses (privatelink.openai.azure.com, privatelink.cognitiveservices.azure.com, privatelink.search.windows.net, privatelink.vaultcore.azure.net, privatelink.blob.core.windows.net, privatelink.azure-api.net, privatelink.api.azureml.ms, privatelink.notebooks.azure.net)."
  type        = map(string)
}

# ---------------------------------------------------------------------------
# Spoke network
# ---------------------------------------------------------------------------
variable "spoke_address_space" {
  description = "Address space for the workload spoke VNet."
  type        = list(string)
  default     = ["10.40.0.0/22"]
}

variable "subnet_prefixes" {
  description = "Subnet prefixes inside the spoke VNet."
  type        = map(string)
  default = {
    private_endpoints = "10.40.0.0/24"
    power_platform    = "10.40.1.0/24" # delegated for Power Platform VNet injection
    apim              = "10.40.2.0/24"
    workload_compute  = "10.40.3.0/24"
  }
}

# ---------------------------------------------------------------------------
# Monitoring
# ---------------------------------------------------------------------------
variable "central_log_analytics_workspace_id" {
  description = "Existing platform Log Analytics workspace resource ID to reuse. If empty, a new one is created in the platform management subscription."
  type        = string
  default     = ""
}

variable "log_analytics_retention_days" {
  description = "Retention (days) when this module creates the workspace."
  type        = number
  default     = 90
}

variable "enable_defender_ai_threat_protection" {
  description = "Enable Microsoft Defender for Cloud AI workloads plan on the workload subscription."
  type        = bool
  default     = true
}

# ---------------------------------------------------------------------------
# Tagging
# ---------------------------------------------------------------------------
variable "platform_tags" {
  description = "Tags applied to platform-managed resources in this landing zone."
  type        = map(string)
  default = {
    managedBy   = "platform-team"
    iac         = "terraform"
    landingZone = "application-platform"
    workload    = "insurance-agent-platform"
  }
}

variable "ai_agents_group_name" {
  description = "Display name of the Entra security group that all agent identities are placed into (Conditional Access target)."
  type        = string
  default     = "ai-agents"
}
