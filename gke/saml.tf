resource "google_container_cluster_saml_authenticator_config" "saml_auth_config" {
  count = var.authentication_method == "saml" ? 1 : 0

  cluster_name = google_container_cluster.main_cluster.name
  location      = google_container_cluster.main_cluster.location

  saml_config {
    idp_metadata_url = var.saml_idp_metadata_url
  }
}
