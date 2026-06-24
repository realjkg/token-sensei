# ---------------------------------------------------------------------------
# Workload spoke network for the insurance-app Application landing zone.
# Lives in the workload subscription; peered to the connectivity hub.
# ---------------------------------------------------------------------------

resource "azurerm_resource_group" "spoke_network" {
  provider = azurerm.workload
  name     = "rg-insurance-app-network"
  location = var.location
  tags     = var.platform_tags
}

resource "azurerm_virtual_network" "spoke" {
  provider            = azurerm.workload
  name                = "vnet-insurance-app"
  location            = azurerm_resource_group.spoke_network.location
  resource_group_name = azurerm_resource_group.spoke_network.name
  address_space       = var.spoke_address_space
  tags                = var.platform_tags
}

resource "azurerm_subnet" "private_endpoints" {
  provider             = azurerm.workload
  name                 = "snet-privateendpoints"
  resource_group_name  = azurerm_resource_group.spoke_network.name
  virtual_network_name = azurerm_virtual_network.spoke.name
  address_prefixes     = [var.subnet_prefixes.private_endpoints]
}

# Delegated subnet for Power Platform VNet injection (enterprise policy).
resource "azurerm_subnet" "power_platform" {
  provider             = azurerm.workload
  name                 = "snet-powerplatform"
  resource_group_name  = azurerm_resource_group.spoke_network.name
  virtual_network_name = azurerm_virtual_network.spoke.name
  address_prefixes     = [var.subnet_prefixes.power_platform]

  delegation {
    name = "powerplatform-vnet-injection"
    service_delegation {
      name    = "Microsoft.PowerPlatform/enterprisePolicies"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

resource "azurerm_subnet" "apim" {
  provider             = azurerm.workload
  name                 = "snet-apim"
  resource_group_name  = azurerm_resource_group.spoke_network.name
  virtual_network_name = azurerm_virtual_network.spoke.name
  address_prefixes     = [var.subnet_prefixes.apim]
}

resource "azurerm_subnet" "workload_compute" {
  provider             = azurerm.workload
  name                 = "snet-workload-compute"
  resource_group_name  = azurerm_resource_group.spoke_network.name
  virtual_network_name = azurerm_virtual_network.spoke.name
  address_prefixes     = [var.subnet_prefixes.workload_compute]
}

# Route everything not local out through the hub Azure Firewall.
resource "azurerm_route_table" "spoke" {
  provider            = azurerm.workload
  name                = "rt-insurance-app-default"
  location            = azurerm_resource_group.spoke_network.location
  resource_group_name = azurerm_resource_group.spoke_network.name
  tags                = var.platform_tags

  route {
    name                   = "to-hub-firewall"
    address_prefix         = "0.0.0.0/0"
    next_hop_type          = "VirtualAppliance"
    next_hop_in_ip_address = var.hub_firewall_private_ip
  }
}

resource "azurerm_subnet_route_table_association" "apim" {
  provider       = azurerm.workload
  subnet_id      = azurerm_subnet.apim.id
  route_table_id = azurerm_route_table.spoke.id
}

resource "azurerm_subnet_route_table_association" "workload_compute" {
  provider       = azurerm.workload
  subnet_id      = azurerm_subnet.workload_compute.id
  route_table_id = azurerm_route_table.spoke.id
}

# Peering: spoke -> hub.
resource "azurerm_virtual_network_peering" "spoke_to_hub" {
  provider                     = azurerm.workload
  name                         = "peer-insurance-app-to-hub"
  resource_group_name          = azurerm_resource_group.spoke_network.name
  virtual_network_name         = azurerm_virtual_network.spoke.name
  remote_virtual_network_id    = var.hub_vnet_id
  allow_forwarded_traffic      = true
  allow_virtual_network_access = true
  use_remote_gateways          = true
}

# NOTE: the hub -> spoke peering, DNS forwarding, and the Private DNS zone
# virtual-network links are owned by the connectivity-hub configuration (the
# Private DNS zones live in the platform connectivity subscription, so their VNet
# links must be created there). After this module runs, the platform team links
# `azurerm_virtual_network.spoke.id` to each zone in var.platform_private_dns_zone_ids
# — or, more commonly, the ALZ "Deploy Private DNS zone group" policy does it
# automatically when private endpoints are created in the spoke. The zone IDs are
# passed through as an output so that step can be automated.

output "spoke_vnet_id" {
  value = azurerm_virtual_network.spoke.id
}

output "subnet_ids" {
  value = {
    private_endpoints = azurerm_subnet.private_endpoints.id
    power_platform    = azurerm_subnet.power_platform.id
    apim              = azurerm_subnet.apim.id
    workload_compute  = azurerm_subnet.workload_compute.id
  }
}
