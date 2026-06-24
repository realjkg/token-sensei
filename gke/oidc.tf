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
