variable "management_group_id" {
  description = "Full resource ID of the Application Platform management group to publish the definitions/initiative into and assign at. e.g. /providers/Microsoft.Management/managementGroups/alz-application-platform"
  type        = string
}

variable "central_log_analytics_workspace_id" {
  description = "Central Log Analytics workspace resource ID for the require-diagnostics policy."
  type        = string
}

variable "policy_remediation_identity_id" {
  description = "User-assigned managed identity resource ID used by the assignment for deployIfNotExists/modify remediation. Created by the application-platform landing zone module."
  type        = string
}

variable "remediation_identity_location" {
  description = "Location for the policy assignment's identity block (must match a region; required when using a user-assigned identity)."
  type        = string
  default     = "eastus2"
}

variable "allowed_locations" {
  description = "Approved regions for AI resources."
  type        = list(string)
  default     = ["eastus2", "swedencentral"]
}

variable "allowed_aoai_model_names" {
  description = "Approved Azure OpenAI / AI Foundry model names."
  type        = list(string)
  default     = ["gpt-4o", "gpt-4o-mini", "text-embedding-3-large"]
}

variable "required_tag_names" {
  description = "Governance tags required on agent resources / resource groups."
  type        = list(string)
  default     = ["agentOwner", "agentPurpose", "dataClassification", "expiresOn"]
}

variable "enforcement_mode" {
  description = "Set to 'Default' to enforce or 'DoNotEnforce' for a dry run."
  type        = string
  default     = "Default"
}
