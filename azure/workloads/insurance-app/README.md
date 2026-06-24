# Insurance agent platform — workload landing zone

The insurance application, **built low-code first** (Power Platform +
Copilot Studio) and progressively connected to APIs, deployed inside the
`insurance-app` Application landing zone created by
`../../landing-zones/application-platform/`.

This is where the agents live. Everything here runs behind the
`ai-agent-governance` policy initiative, so it is governed-by-default:
private endpoints only, approved regions/models only, Entra ID auth only,
diagnostics to the central workspace, and required ownership/classification tags.

## What it provisions

| File | Resources |
|---|---|
| `main.tf` | Resource groups, naming, common tags (incl. the policy-required `agentOwner` / `agentPurpose` / `dataClassification` / `expiresOn`). |
| `identity-agents.tf` | One identity **per agent** — `policy-intake-agent`, `claims-triage-agent`, `underwriting-copilot`, `fraud-signal-agent`. Each is a user-assigned managed identity (for the Azure-hosted tool/back-end) **and** registered as an Entra app for the Copilot Studio agent's **Entra Agent ID**. No client secrets. Scoped RBAC. All added to the `ai-agents` group (Conditional Access target). Workload identity federation for the CI/CD pipeline. |
| `key-vault.tf` | Workload Key Vault — RBAC mode, purge protection, **public access disabled**, private endpoint. Holds the few unavoidable secrets (e.g., partner API keys consumed only via APIM). |
| `power-platform.tf` | Three Dataverse environments (`insurance-dev/test/prod`), each turned into a **Managed Environment** (maker sharing limits, Solution Checker enforced on publish, weekly usage insights, env IP firewall pinned to the spoke ranges). VNet injection enterprise policy bound to `snet-powerplatform`. |
| `dlp-policy.tf` | A tenant **baseline** DLP policy + an environment-scoped DLP policy classifying the connector catalog into **Business / Non-Business / Blocked**, with custom connectors restricted to the APIM gateway host. |
| `connectors-apim.tf` | Internal-VNet **API Management** instance; imports the OpenAPI specs in `connectors/` as APIM APIs and exposes them as Power Platform **custom connectors** with Entra ID auth + per-agent subscription keys held in Key Vault. The "widest array" of template connectivity comes from the Business connector group in `dlp-policy.tf`; bespoke insurance APIs come through here. |
| `ai-foundry.tf` | Azure AI Foundry hub + project, an Azure OpenAI account (local auth disabled, public access disabled) with **only approved model deployments**, an Azure AI Search service (private) for grounding, and an **Azure AI Content Safety** resource with a default blocklist. |
| `observability.tf` | One Application Insights component per agent (workspace-based, pointed at the central Log Analytics workspace); diagnostic settings on APIM / OpenAI / Search / Key Vault; reference to the tenant Purview account for the AI audit / DSPM-for-AI connector. |
| `networking.tf` | Private endpoints (into `snet-privateendpoints`) for OpenAI, AI Search, Key Vault, Storage, AI Foundry, and APIM. No public ingress. |
| `connectors/*.openapi.yaml` | Sample bespoke insurance API specs (`insurance-policy-api`, `claims-api`) imported by `connectors-apim.tf`. |

## Low-code first → API connectors (the progression)

1. **Day 1 — low-code.** Makers build the claims/underwriting apps and Copilot
   Studio agents in `insurance-dev` using the **Business** connector group
   (Dataverse, SharePoint, Outlook, Teams, SQL, Azure Blob, Service Bus, Azure
   OpenAI, AI Builder, DocuSign/Adobe Sign, Salesforce, Dynamics 365, …). The
   DLP policy and Managed Environment settings are already enforced, so nothing
   risky can be wired up.
2. **Week N — bespoke APIs.** Policy-admin, rating, and claims-core APIs are
   published behind APIM (`connectors-apim.tf`) and surfaced as governed custom
   connectors with Entra ID auth. The DLP policy only allows custom connectors
   whose host is the APIM gateway — so makers can't hand-roll an ungoverned one.
3. **Always — agents are identities.** Each Copilot Studio agent authenticates
   with its **Entra Agent ID**; each Azure-side tool/back-end uses the matching
   **user-assigned managed identity**; both are in the `ai-agents` group and
   subject to Conditional Access; every call is logged and attributable.

## ALM

Power Platform **pipelines** promote solutions `insurance-dev → test → prod`.
Solution Checker runs on every publish (Managed Environment). Connector
definitions, environment settings, and DLP policies are all in this Terraform —
the apps/agents themselves are in solution files managed by the workload team.

## Inputs

See `variables.tf` / `terraform.tfvars.example`. The networking/identity/log
inputs are designed to be fed straight from the application-platform module's
`landing_zone_summary` output.
