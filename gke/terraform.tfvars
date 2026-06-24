#Ensure any of these sensitive string values are encrypted with git-crypt or HCL vault

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

variable "kms_keyring_name" {
  description = "The name of the KMS keyring"
  type        = string
  default     = "adapt-k8s-keyring"
}

variable "kms_keyring_location" {
  description = "The location of the KMS keyring"
  type        = string
  default     = "us-central1"
}

variable "kms_crypto_key_name" {
  description = "The name of the KMS crypto key"
  type        = string
  default     = "adapt-k8s-crypto-key"
}

variable "kms_crypto_key_rotation_period" {
  description = "The rotation period for the KMS crypto key in seconds"
  type        = string
  default     = "100000s"
}
