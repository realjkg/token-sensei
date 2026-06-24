Adaptcloud.io - GKE Terraform deployment

Initial MVP repository and GKE setup this repo contains secure hardening and will contain chatGPT webhooks as well as GKE hooks for the community to use

For providing templates to the user community to tryout hardening techniques.  None of this code is expected to go directly from Dev to Prod, so do not use it for Prod without any testing and evaluation.

This is the initial DevOps dev-account commit repo for GKE-based terraform.  Code is subject to change with or without notice, so use at your own risk.

The location of the container should be inside of a managed Kubernetes environment, or GKE. the terrafor will execute and build docker containers or GKE based containers.

Prerequisites:

1. SSO-based MFA - use either an OIDC or SAML provider.  this will be used for placement inside of the terraform builder code UI.

2. GKE-role build and account access to dev account - this will be non-negotiable for the build side.  A list of the RBAC-roles for GKE are listed here: https://cloud.google.com/kubernetes-engine/docs/how-to/iam

3. Access to relevant GKE account environment with placement of consolidated devtools, contained in the docker containers within the Kubernetes footprint. 
