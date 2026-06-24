terraform {
  required_version = ">= 1.6.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 3.0"
    }
  }

  # Recommended: remote state in a platform-owned storage account, not local.
  # backend "azurerm" {}
}

provider "azurerm" {
  features {}
  subscription_id = var.platform_management_subscription_id
}

# Aliased provider scoped to the workload subscription (used for the spoke network
# resources that live inside the vended Application landing zone).
provider "azurerm" {
  alias = "workload"
  features {}
  subscription_id = var.insurance_subscription_id
}

provider "azuread" {}
