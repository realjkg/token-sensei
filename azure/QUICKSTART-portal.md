# Quickstart — stand it up from the portal

This is the click-by-click path to get a **governed insurance agent** running,
in the same order as the Terraform under `azure/`. Each step maps to an IaC file
so you can swap manual setup for code later (`terraform import`, or rebuild in a
non-prod subscription and retire the click-built one).

Nothing here is meant to go straight to production — review, parameterize, and
run it through your own pipeline first.

> **Day-1 minimum to demo a governed agent:** steps 1, 2 (a subset of policies),
> 3, and 4. Layer in 5–7 afterwards.

---

## 1. Land the Application Platform landing zone — Azure portal

> Maps to `azure/landing-zones/application-platform/` (`management-group.tf`,
> `subscription-vending.tf`, `main.tf`).

1. **Management groups** (`portal.azure.com` → *Management groups*) → if you
   don't already have an **Application Platform** management group, **+ Create**
   one named `alz-application-platform` under your platform "Landing Zones" MG
   (or under the tenant root if you have no MG hierarchy yet). *This is the "if
   there's no Application Platform LZ, ensure we do that" step.*
2. Move (or create) the **`insurance-app` subscription** and place it under
   `alz-application-platform` (*Subscriptions* → pick subscription → *Move* →
   target = the new MG; or *+ Add* a new subscription).
3. In that subscription create three resource groups in a region on your
   allow-list (e.g. **East US 2**): `rg-insurance-app-workload`,
   `rg-insurance-app-ai`, `rg-insurance-app-identity`.
4. *(Optional now — do later with `networking.tf`)* a spoke VNet with subnets
   `snet-privateendpoints`, `snet-powerplatform` (delegate to
   `Microsoft.PowerPlatform/enterprisePolicies`), `snet-apim`, peered to your
   connectivity hub. You can start without VNet injection / private endpoints and
   add them before prod.

---

## 2. Policy as code — Azure portal → Policy

> Maps to `azure/policy-as-code/` (`definitions/*.json`,
> `initiative/ai-agent-governance-initiative.json`, `initiative/policy_assignments.tf`).

1. **Policy → Definitions → + Policy definition** → set *Definition location* =
   `alz-application-platform` → paste the contents of each file in
   `azure/policy-as-code/definitions/*.json` (the whole object — the portal reads
   the `properties` block) → *Save*. Repeat for all seven.
2. **Policy → Definitions → + Initiative definition** → location =
   `alz-application-platform` → *Add policy definition(s)* → add the seven you
   just created → on the *Initiative parameters* tab expose `allowedLocations`,
   `allowedModelNames`, `requiredTagNames`, `logAnalyticsWorkspaceId` → set the
   `effect` group values (Deny / Audit / DeployIfNotExists per the file
   comments) → *Save*.
3. **Policy → Assignments → Assign initiative** → *Scope* =
   `alz-application-platform` → pick the initiative → on *Remediation*, choose
   **Create a system-assigned managed identity** (the portal grants it the role
   needed for the `DeployIfNotExists` diagnostics policy) → set the parameter
   values (your regions, approved model names, the Log Analytics workspace ID
   from step 7) → *Review + create*.
4. **Faster, repeatable alternative:** open **Cloud Shell** from the portal and
   run the Terraform in `azure/policy-as-code/initiative/` (it publishes the
   definitions, builds the initiative, and assigns it with the platform
   remediation identity), or `az policy definition create … && az policy
   set-definition create … && az policy assignment create …`.

> Day-1 subset if you want to move fast: assign at least
> *allowed-ai-locations*, *deny-ai-public-network-access*, and
> *require-agent-resource-tags*. Add the rest once the AI plane exists.

---

## 3. Low-code platform — Power Platform admin center (`admin.powerplatform.microsoft.com`)

> Maps to `azure/workloads/insurance-app/power-platform.tf` and `dlp-policy.tf`;
> connector lists are `variables.tf` → `business_connectors` /
> `non_business_connectors` / `blocked_connectors`.

1. **Environments → + New** → create `insurance-dev` (*Type* = Sandbox, **Add a
   Dataverse data store** = Yes). Repeat for `insurance-test` (Sandbox) and
   `insurance-prod` (Production).
2. For each environment: select it → **Edit Managed Environment** → toggle it
   **On** → *Sharing* limit makers to **20** users per app → *Solution checker*
   = **Block** (block publish on errors) → *Usage insights* = **On (weekly)** →
   add the maker onboarding note. *(IP firewall: bind to the spoke / APIM egress
   ranges once the network exists.)*
3. **Policies → Data policies → + New policy** → name
   *"Insurance agent platform – connector governance"*:
   - **Business**: the certified/Microsoft-published connectors the apps may use
     — Dataverse, SharePoint, Outlook (Office 365), Office 365 Users, Teams,
     OneDrive for Business, SQL Server, Azure Blob, Azure Queues, Service Bus,
     Event Hubs, **Azure OpenAI**, Text Analytics, Computer Vision, **Document
     Intelligence (Form Recognizer)**, AI Builder, Dynamics 365 Business Central,
     Salesforce, **DocuSign**, **Adobe Acrobat Sign**, Approvals, Excel Online
     (Business), Word Online (Business), Power BI, Azure Automation.
   - **Non-Business**: low-risk general connectors (RSS, MSN Weather, Bing Maps).
   - **Blocked**: X/Twitter, Facebook, Instagram, YouTube, Dropbox, Box, Google
     Drive, Gmail, consumer OneDrive, SMTP "send mail", HTTP-with-Azure-AD/HTTP,
     and **non-Azure OpenAI**.
   - **Custom connectors** → set a connector pattern that **allows only**
     `https://apim-insurance-app.azure-api.net/*` and **blocks `*`** → so makers
     can't hand-roll an ungoverned connector.
   - **Scope** = these environments → `insurance-dev/test/prod`.
4. **Settings → Tenant settings** → restrict who can create production / trial /
   developer environments; turn off broad maker capabilities you don't need.
   *(Optional: install the **Power Platform CoE Starter Kit** for the live agent
   & app inventory referenced in the governance doc.)*

---

## 4. Create the agent — and its identity — Copilot Studio (`copilotstudio.microsoft.com`)

> Maps to `azure/workloads/insurance-app/identity-agents.tf` (the per-agent
> identities, the `ai-agents` group, and the Conditional Access note).

1. Switch to the **`insurance-dev`** environment → **+ Create / New agent** →
   e.g. `claims-triage-agent`. Because the environment is a **Managed
   Environment**, when you publish the agent it is automatically issued a
   **Microsoft Entra Agent ID** — that's the secure, traceable, governed identity
   (no client secret).
2. Configure the agent:
   - **Settings → Security → Authentication** = *Authenticate with Microsoft*
     (Microsoft Entra ID).
   - **Knowledge** = only the approved sources (SharePoint sites / Dataverse
     tables you've sanctioned).
   - **Topics / Actions** for sensitive operations (bind quote, authorise
     payout) → require **confirmation** (human-in-the-loop).
   - **Actions / Tools** → connect only via the Business connectors and your
     APIM custom connector from step 6.
3. **Entra admin center** (`entra.microsoft.com`):
   - **Identity → Groups → + New group** → security group **`ai-agents`** → add
     the agent's identity (and any user-assigned managed identities from the AI
     plane) as members. This is the inventory + Conditional Access target.
   - **Identity → Applications → Agent ID** (preview) — confirm the agent shows
     up here; set an **owner**.
   - **Protection → Conditional Access → + New policy** → *Assignments* target
     **Workload identities** = the `ai-agents` group → *Conditions*: block
     legacy authentication; *Locations*: allow only your named locations (the
     spoke / APIM egress IPs) → *Grant*: Block otherwise. *(Conditional Access
     for workload identities requires the Microsoft Entra Workload ID add-on.)*
   - **Identity Governance → Access reviews → + New** → quarterly review over the
     `ai-agents` group; disable then delete any agent with no owner or past its
     `expiresOn` tag.

---

## 5. AI plane (for grounded / code-first agents) — Azure AI Foundry portal (`ai.azure.com`)

> Maps to `azure/workloads/insurance-app/ai-foundry.tf`,
> `key-vault.tf`, `networking.tf`.

1. **+ New hub** in `rg-insurance-app-ai` → attach a Storage account and a Key
   Vault → set **Public network access = Disabled** → then **+ New project** in
   that hub (`proj-insurance-agents`).
2. **Deployments → + Deploy model** → deploy *only* the approved models:
   `gpt-4o`, `gpt-4o-mini`, `text-embedding-3-large` — the
   *allowed-aoai-model-deployments* policy will block anything else.
3. Add **Azure AI Search** (`srch-insurance-app`, public access disabled, local
   auth disabled) for grounding, and an **Azure AI Content Safety** resource;
   enable **Prompt Shields** and create a default blocklist.
4. **Private endpoints** (portal → each resource → *Networking → Private
   endpoint connections → + Private endpoint*) into `snet-privateendpoints` for
   the Azure OpenAI account, AI Search, Content Safety, the AI Foundry hub, the
   storage account, and Key Vault. Disable public access on each.
5. **Microsoft Defender for Cloud** → *Environment settings* → the
   `insurance-app` subscription → enable the **AI workloads** plan (prompt-injection
   / anomalous-usage detection), plus **Key Vault** and **ARM** plans.
6. Give each agent's **user-assigned managed identity** (from `identity-agents.tf`,
   or create them under `rg-insurance-app-identity` in *Managed Identities*) the
   scoped roles only: *Cognitive Services OpenAI User* on the AOAI account,
   *Search Index Data Reader* on AI Search, *Key Vault Secrets User* on the
   vault, *Monitoring Metrics Publisher* on its App Insights.

---

## 6. API connectors — Azure portal → API Management

> Maps to `azure/workloads/insurance-app/connectors-apim.tf` and the OpenAPI
> specs in `azure/workloads/insurance-app/connectors/`.

1. **Create a resource → API Management** in `rg-insurance-app-workload`
   (Developer tier to start; switch to **Internal VNet** mode against
   `snet-apim` when the spoke is ready). Enable its **system-assigned identity**
   and give it **Key Vault Secrets User** on the workload vault.
2. **APIs → + Add API → OpenAPI** → upload
   `connectors/insurance-policy-api.openapi.yaml`, then `connectors/claims-api.openapi.yaml`.
3. On each API → **Design → All operations → Inbound processing → </> (code
   view)** → add a `validate-azure-ad-token` policy (and a `rate-limit`) so every
   call is an authenticated Entra ID token — agents call APIM with their managed
   identity / Entra Agent ID, never an API key.
4. On each API → **… → Export → Power Platform** (Power Automate / Power Apps) →
   choose the `insurance-dev` environment → this publishes the API as a governed
   **custom connector**. The DLP rule from step 3 means it's allowed (host =
   `apim-insurance-app.azure-api.net`) and nothing else is.
5. **APIM → Monitoring → Diagnostic settings** → stream `GatewayLogs` to the
   central Log Analytics workspace (the *require-diagnostic-settings* policy will
   also remediate this).

---

## 7. Observability — Azure portal + Purview

> Maps to `azure/landing-zones/application-platform/monitoring.tf` and
> `azure/workloads/insurance-app/observability.tf`.

1. **Create a Log Analytics workspace** `law-application-platform` (or reuse the
   platform one) → **Microsoft Sentinel → + Add** onto that workspace.
2. For each agent: **Create → Application Insights** → *Workspace-based*, pointed
   at `law-application-platform`; tag it `agentName=<agent>`. Wire the
   connection string into the Copilot Studio agent's analytics / your code-first
   agent.
3. **Diagnostic settings** on the Azure OpenAI account, AI Search, Content
   Safety, Key Vault, and APIM → send all logs/metrics to
   `law-application-platform` (policy enforces; this just avoids the remediation lag).
4. **Microsoft Purview / Compliance portal** → turn on **Audit** → enable **DSPM
   for AI** → register the AI Foundry project and the agents' knowledge sources
   as data sources → apply sensitivity labels so prompts/responses, data access,
   and agent actions are captured and label-aware.

---

## Where to go from the portal to IaC

| Portal step | IaC to adopt next |
|---|---|
| 1 | `azure/landing-zones/application-platform/` (`terraform import` the MG + subscription association, or rebuild in a non-prod sub) |
| 2 | `azure/policy-as-code/` (definitions + initiative + assignment) |
| 3 | `azure/workloads/insurance-app/power-platform.tf`, `dlp-policy.tf` |
| 4 | `azure/workloads/insurance-app/identity-agents.tf` (+ keep the Conditional Access policy in your identity-governance pipeline) |
| 5 | `azure/workloads/insurance-app/ai-foundry.tf`, `key-vault.tf`, `networking.tf` |
| 6 | `azure/workloads/insurance-app/connectors-apim.tf` (+ the `connectors/*.openapi.yaml` specs) |
| 7 | `azure/landing-zones/application-platform/monitoring.tf`, `azure/workloads/insurance-app/observability.tf` |

See `azure/docs/caf-ai-agent-governance-mapping.md` for the control-by-control
mapping to the Microsoft CAF "Govern and secure AI agents across your
organization" guidance.
