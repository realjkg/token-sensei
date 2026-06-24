variable "authentication_method" {
  description = "The authentication method to use for the GKE cluster. Options: 'oidc', 'saml'"
  type        = string
  default     = "oidc"
}

variable "oidc_issuer_url" {
  description = "The OIDC issuer URL"
  type        = string
}

variable "oidc_client_id" {
  description = "The OIDC client ID"
  type        = string
}

variable "oidc_api_audience" {
  description = "The API audience"
  type        = string
}

variable "saml_idp_metadata_url" {
  description = "The SAML IdP metadata URL"
  type        = string
}
