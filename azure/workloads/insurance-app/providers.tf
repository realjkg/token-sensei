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
    azapi = {
      source  = "azure/azapi"
      version = "~> 2.0"
    }
    powerplatform = {
      source  = "microsoft/power-platform"
      version = "~> 3.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # backend "azurerm" {}
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = false
    }
  }
  subscription_id = var.insurance_subscription_id
}

provider "azuread" {}
provider "azapi" {}

# Power Platform provider — authenticates to the same tenant; needs the
# Power Platform admin scopes (use a service principal that is a Power Platform
# administrator). See https://registry.terraform.io/providers/microsoft/power-platform
provider "powerplatform" {
  use_cli = true
}

provider "random" {}
