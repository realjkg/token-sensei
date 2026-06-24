 terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 3.0"
    }
  }
}

provider "google" {
  project = "mystical-button-380517"
  region  = "us-central1"
}

module "gke_cluster" {
  source = "terraform-google-modules/kubernetes-engine/google//modules/hardened_cluster"

  project_id            = "mystical-button-380517"
  name                  = "adaptcloud-k8s"
  region                = "us-central1"
  zones                 = ["us-central1-a", "us-central1-b", "us-central1-c"]
  node_count            = 3
  node_machine_type     = "n1-standard-2"
  node_max_pods_per_node = 30

  # Enable Shielded GKE Nodes
  enable_shielded_nodes = true

  # Configure the GKE cluster to use a hardened node image.
  # Hardened images include CIS benchmark configurations and additional security features.
  node_image_type = "COS_CONTAINERD"

  # Binary Authorization
  enable_binary_authorization = true

  # Configure the GKE cluster to use private nodes and private endpoint.
  enable_private_nodes   = true
  master_authorized_networks_config = [
    {
      cidr_block = "10.0.0.0/8" # Allow only internal IP ranges
    }
  ]
  private_cluster_config = {
    enable_private_endpoint = true
    master_ipv4_cidr_block = "172.16.0.0/28"
    private_endpoint_dns_zone = "adaptcloud.com"
  }

  # Configure the GKE cluster to use workload identity and IAM roles for service accounts.
  # This restricts permissions to the minimum necessary for each workload.
  enable_workload_identity = true

  # Configure the GKE cluster to use VPC-native networking.
  enable_network_policy = true
  network_policy_config = {
    enabled = true
    provider = "CALICO"
  }

  # Configure additional security features.
  enable_pod_security_policy = true
  enable_kubernetes_alpha = true

  # Configure the GKE cluster to use RBAC and enforce strict PodSecurityPolicies.
  enable_rbac = true
  pod_security_policy = {
    enabled = true
    policy_types = ["PodSecurityPolicy"]
  }

  # Configure the GKE cluster to use a custom logging and monitoring solution.
  # For example, you can use Prometheus, Fluentd, and Grafana to collect and analyze logs and metrics.
  # You can also deploy Falco to monitor for abnormal behavior in your cluster.
  logging_service = "none"
  monitoring_service = "none"

  # Configure the GKE cluster to use a custom container registry, such as Harbor.
  add_ons_config = {
    http_load_balancing = {
      disabled = true
    }
    istio_config = {
      disabled = true
    }
    kubernetes_dashboard = {
      disabled = true
    }
    network_policy_config = {
      disabled = true
    }
  }
  
  
  # This example uses Google Container Registry, but you can use any other Docker registry.
  master_auth_username = "_json_key"
  master_auth_password = "${file("/path/to/docker-registry/key.json")}"
  node_config {
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform",
      "https://www.googleapis.com/auth/devstorage.full_control"
    ]
  }
}

  
  
# Create a Kubernetes namespace for logging and monitoring
resource "kubernetes_namespace" "logging" {
  metadata {
    name = "logging-monitoring"
    labels = {
      managed-by = "terraform"
      purpose    = "logging-monitoring"
    }
  }
}

#Begin Cluster Bindings
  
  module "gke_monitoring" {
  source  = "terraform-google-modules/kubernetes-engine/google//modules/prometheus"
  version = "~> 16.0.0"

  project_id = "mystical-button-380517"
  region     = "us-central1"
  cluster    = module.gke_cluster.cluster

  prometheus_node_exporter_enabled = true
  prometheus_service_account        = module.gke_cluster.service_account
  grafana_enabled                   = true
  grafana_service_account           = module.gke_cluster.service_account
  fluentd_enabled                   = true
  fluentd_service_account           = module.gke_cluster.service_account
}
    
resource "google_organization_iam_binding" "gke_cluster_binding" {
  org_id = "ADAPTCLOUD_DEV"
  role = "roles/container.admin"

  members = [
    "serviceAccount:my-gcp-service-account@my-gcp-project.iam.gserviceaccount.com",
  ]
}
    

resource "google_organization_iam_binding" "gke_cluster_monitoring_binding" {
  org_id = "ADAPTCLOUD_DEV"

  for_each = toset([
    "roles/logging.privateLogViewer",
    "roles/logging.logWriter",
    "roles/monitoring.editor",
    "roles/monitoring.metricWriter",
  ])

  role = each.key

  members = [
    "serviceAccount:my-gcp-service-account@my-gcp-project.iam.gserviceaccount.com",
  ]
}
  
resource "google_container_cluster_oidc_authenticator_config" "oidc_auth_config" {
  count = var.authentication_method == "oidc" ? 1 : 0

  cluster_name = google_container_cluster.main_cluster.name
  location      = google_container_cluster.main_cluster.location

  oidc_config {
    issuer_url    = var.oidc_issuer_url
    client_id     = var.oidc_client_id
    k8s_api_audiences = [var.oidc_api_audience]
  }
}

resource "google_container_cluster_saml_authenticator_config" "saml_auth_config" {
  count = var.authentication_method == "saml" ? 1 : 0

  cluster_name = google_container_cluster.main_cluster.name
  location      = google_container_cluster.main_cluster.location

  saml_config {
    idp_metadata_url = var.saml_idp_metadata_url
  }
}

  #This is the GCR Bucket which contains the encryption settings including the GC keyring for the registry

resource "google_kms_key_ring" "gcr_key_ring" {
  name     = "gcr-keyring"
  location = "us-central1"
}

resource "google_kms_crypto_key" "gcr_crypto_key" {
  name     = "gcr-key"
  key_ring = google_kms_key_ring.gcr_key_ring.self_link
}

resource "google_storage_bucket" "gcr_bucket" {
  name     = "adaptcloud-k8s-docker-registry"
  location = "us-central1"

  storage_class = "STANDARD"

  versioning {
    enabled = true
  }

  # Configure the GCR bucket to use customer-managed encryption keys
  encryption {
    default_kms_key_name = google_kms_crypto_key.gcr_crypto_key.self_link
  }
}


resource "google_service_account" "gcr_service_account" {
  account_id   = "adaptcloud-k8s-docker-registry"
  display_name = "Docker Registry Service Account"
}

resource "google_storage_bucket_iam_binding" "gcr_bucket_binding" {
  bucket = google_storage_bucket.gcr_bucket.name
  role   = "roles/storage.objectAdmin"

  members = [
    "serviceAccount:${google_service_account.gcr_service_account.email}"
  ]
}

resource "google_service_account_key" "gcr_service_account_key" {
  service_account_id = google_service_account.gcr_service_account.name
}
    
#This is the main cluster buildout
    
 resource "google_container_cluster" "main_cluster" {
  name               = "main-cluster"
  location           = "us-central1"
  initial_node_count = 3

  master_auth {
    username = ""
    password = ""

    client_certificate_config {
      issue_client_certificate = false
    }
  }
}
    
#encryption blocks and KMS hardening here
    
    resource "google_kms_key_ring" "kms_keyring" {
  name     = "adapt-k8s-keyring"
  location = "us-central1"
}

resource "google_kms_crypto_key" "kms_crypto_key" {
  name            = "adapt-k8s-crypto-key"
  key_ring        = google_kms_key_ring.kms_keyring.self_link
  rotation_period = "100000s"
}

    
    resource "google_storage_bucket" "encrypted_bucket" {
  name     = "adapt-k8s-${random_id.bucket_suffix.hex}"
  location = "us-central1"

  encryption {
    default_kms_key_name = google_kms_key_ring.kms_keyring.crypto_key_id
  }
}

#By setting an empty members list in the google_storage_bucket_iam_binding resource, we are effectively removing any public access bindings associated with the roles/storage.objectViewer role
resource "google_storage_bucket_iam_binding" "private_bucket" {
  bucket = google_storage_bucket.encrypted_bucket.name
  role   = "roles/storage.objectViewer"

  members = []
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}
    
    
# Ensure bucket hardening with the keyring config below
    
    resource "google_storage_bucket" "encrypted_bucket" {
  name     = "adapt-k8s-${random_id.bucket_suffix.hex}"
  location = "us-central1"

    encryption {
  default_kms_key_name = google_kms_crypto_key.kms_crypto_key.self_link
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

      #Ensure bucket access has read-only viewer role with service rbac account
     
    resource "google_service_account" "gcs_rbac_account" {
  account_id   = "gcs-rbac-account"
  display_name = "GCS RBAC Service Account"
}

resource "google_storage_bucket_iam_member" "bucket_rbac_access" {
  bucket = google_storage_bucket.encrypted_bucket.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.gcs_rbac_account.email}"
}
      
# Members only provided in the email list have access to the monitoring bucket     
# Adjust the email address(es) below to match the desired GCP account.
#      member = "serviceAccount:my-gcp-service-account@my-gcp-project.iam.gserviceaccount.com"



    # Configure the GKE cluster to use a custom Docker registry.
  # This example uses Google Container Registry, but you can use any other Docker registry.
  master_auth_username = "_json_key"
  master_auth_password = "${base64decode(google_service_account_key.gcr_service_account_key.private_key)}"

  node_config {
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform",
      "https://www.googleapis.com/auth/devstorage.full_control"
    ]
  }
}


      
