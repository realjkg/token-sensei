# Cost & teardown

Rough monthly costs for the insurance agent platform. **List prices, USD,
pay-as-you-go, East US 2, no EA/CSP discount, early-2026 rates — always confirm
with the [Azure Pricing Calculator](https://azure.com/e/) before you commit.**
Power Platform / Copilot Studio is **licensing & capacity**, not Azure metering —
treated separately below.

Two ready-made variable sets are in [`profiles/`](profiles/): `dev-demo` and
`prod`. The module defaults sit between them.

| | `profiles/dev-demo` | module defaults | `profiles/prod` |
|---|---|---|---|
| Idle Azure cost / month | **~$80–150** | ~$600–750 | **~$3,500–6,000+** |
| Private endpoints | off (public) | on | on |
| VNet injection / APIM mode | off / external | off / external (APIM Developer) | on / **Internal** |
| API Management SKU | `Consumption_0` (serverless) | `Developer_1` (~$50) | `Premium_1` (~$2,800/unit) |
| AI Search | `basic`, 1×1 (~$75) | `standard`, 1×2 (~$490) | `standard`, 1×3 (~$735) |
| Power Platform environments | 1 sandbox | 3 | 3 (dev/test/prod) |
| Agents (identities) | 1 | 4 | 4 |
| Log Analytics retention | 30 d | 90 d | 90 d |
| Defender for Cloud AI plan | off | on | on |
| Key Vault purge protection | off | on | on |
| Governance policies | run in **Audit** | enforced | enforced |

> The demo profile uses **public endpoints** — only acceptable for non-sensitive
> demo data with the `ai-agent-governance` initiative assigned in **Audit** mode.

## Where the money goes

| Component | Pricing model | ~Idle / month | Notes & knobs |
|---|---|---|---|
| **Azure AI Search** | per *search unit* (replicas × partitions) × tier hourly rate; billed while the service exists, idle or not | `free` $0 · `basic` ~$75 · `standard` (S1) ~$245/unit | Biggest fixed line at the defaults (2 units ≈ $490). Knobs: `ai_search_sku`, `ai_search_replica_count`, `ai_search_partition_count`. `free` = no SLA, 3 indexes — fine for a demo. |
| **API Management** | per gateway unit, hourly (or per-call for Consumption) | `Consumption_0` ~$0 + ~$3.50 / 1M calls · `Developer_1` ~$50 (no SLA) · `StandardV2_1` ~$700 (VNet) · `Premium_1` ~$2,800/unit (Internal VNet + zones) | Knob: `apim_sku_name`. Consumption can't do Internal VNet — pair with `enable_vnet_injection=false`. Premium is the jump that takes you to four figures. |
| **Private endpoints** | ~$0.013/hr each (~$9.50/mo) + ~$0.01/GB processed | ~$45–65 (≈6–7 PEs) | Knob: `enable_private_endpoints` (off ⇒ no PEs, public access on). |
| **Log Analytics + Microsoft Sentinel** | per GB ingested (~$2.30–2.76/GB after 5 GB free) + Sentinel ~$2.46/GB + retention >31 d (~$0.12/GB/mo) | ~$10–80 | Scales with how chatty diagnostic settings are. Knob: `log_analytics_retention_days`; reuse the platform workspace via `central_log_analytics_workspace_id`. |
| **Defender for Cloud** (ARM + Key Vault + AI workloads plans) | ARM ~$4–5/sub · Key Vault ~$0.02/10K txns · AI plan metered | ~$10–30 | Knob: `enable_defender_ai_threat_protection`; the ARM + Key Vault plans are always set by the workload module. |
| **Azure OpenAI** (account is free) | per 1K/1M tokens | **$0 idle → variable** | `capacity` in `approved_model_deployments` is TPM *quota*, not a reservation — unused costs nothing. gpt-4o ≈ $2.50 / $10 per 1M in/out · gpt-4o-mini ≈ $0.15 / $0.60 · text-embedding-3-large ≈ $0.13 per 1M. (Provisioned throughput "PTU" would be a fixed hourly charge — not used here; deployments are `Standard` = PAYG.) |
| **Azure AI Content Safety** | per 1K records | $0 idle → ~$0.75 / 1K text records | Metered only. |
| **AI Foundry hub + project** | free (it's an Azure ML workspace) — you pay for attached storage/KV/ACR and any compute | ~$0 (no compute provisioned) | Add compute clusters/online endpoints and they bill separately. |
| **Application Insights** (per agent + APIM) | workspace-based ⇒ ingestion billed via Log Analytics above | components free | Included in the LAW line. |
| **Key Vault** (Standard) | ~$0.03 per 10K operations | ~$1–3 | Knob: `key_vault_purge_protection` (affects teardown, not cost — see below). |
| **Storage** (ZRS, Standard) | per GB + transactions | ~$1–5 | AI Foundry's backing store; grows with artifacts. |
| **Networking** (VNet, peering, route table, NSGs) | VNet/RT free; peering ~$0.01/GB each way | ~$1–10 | |
| **Management groups, policy assignments, managed identities, Entra apps/groups, budgets** | free | $0 | |
| **Power Platform / Copilot Studio** | licensing & capacity | **$0 if entitled, else $$$** | Each *production* Dataverse env needs ~1 GB DB drawn from tenant capacity (overage ~$40/GB/mo). Managed Environments require premium Power Platform per-user (~$5–20/user/mo) or per-app plans. **Copilot Studio** runs on a Copilot Studio license **or message packs (~$200/mo per 25K messages)**. Sandbox envs are cheaper / no min DB. |

**Bottom line at the module defaults:** ~$600–750/month on the Azure side
(AI Search + APIM + private endpoints dominate), **plus** model token usage,
**plus** Power Platform / Copilot Studio licensing.

### The five knobs that move the needle most
1. `apim_sku_name` — `Developer_1` (~$50) vs `Premium_1` (~$2,800/unit).
2. `ai_search_sku` + `ai_search_replica_count` — `basic` 1×1 (~$75) vs `standard` 1×3 (~$735).
3. `enable_private_endpoints` — off saves ~$50/mo (but you lose network isolation).
4. `log_analytics_retention_days` + reusing the platform workspace.
5. Number of `power_platform_environments` and `agents` (mostly licensing/quota, not Azure $).

## Can you tear it down at will?

**Yes** — `terraform destroy` per module, reverse order:
`workloads/insurance-app` → `policy-as-code/initiative` → `landing-zones/application-platform`.
(Deny-policies gate *create/update*, not *delete*, so order is for tidiness, not
correctness.) Things to know:

- **What actually stops the meter:** AI Search and API Management bill *while they
  exist*, idle or not — destroy those first if you just want billing to stop fast.
  OpenAI / Content Safety stop the moment you stop calling them.
- **Key Vault won't fully disappear if `key_vault_purge_protection = true`.** It
  stays soft-deleted for 90 days and **cannot be force-purged** — the name is
  unusable for 90 days. The `dev-demo` profile sets it `false` (7-day soft-delete,
  purgeable) so you can rebuild. To purge a soft-deleted vault:
  `az keyvault purge --name <kv> --location <region>` (only works when purge
  protection was off).
- **Cognitive Services** (Azure OpenAI, Content Safety) and **API Management**
  also soft-delete (~48 h). Purge to free the name immediately:
  `az cognitiveservices account purge -g <rg> -n <acct> -l <region>` /
  `az apim deletedservice purge --service-name <apim> --location <region>` — or
  just use new names on redeploy. APIM Developer deletes in ~5–15 min; Premium can
  take 30–45 min.
- **Power Platform environments** are deleted with their Dataverse data; a PP
  admin can restore an environment for ~7 days, then it's gone. The DLP policies
  are removed too — note the **tenant baseline DLP** is tenant-wide.
- **The Application Platform management group** is deleted only if the workload
  module *created* it (`create_application_platform_mg = true`) and it's empty.
  If it pre-existed (referenced via data source), nothing happens. The
  subscription→MG association is just removed; the subscription itself is **not**
  deleted by Terraform (a *vended* subscription, if you used that path, is
  *cancelled* — its own ~90-day window — not destroyed).
- **`DeployIfNotExists` leftovers:** removing the policy assignment doesn't remove
  the diagnostic settings it deployed onto resources — moot if you're deleting
  those resources anyway.
- **Portal-created agents aren't in Terraform state.** If you stood up a Copilot
  Studio agent by hand, delete it in Copilot Studio — and the Entra Agent ID with
  it; `terraform destroy` won't.
- **Defender for Cloud plans** revert to Free tier on destroy — no lingering cost.
- **Soft-deleted resources block redeploy** of the same names — purge them (above)
  or change names.

### Cheapest "create, demo, delete" loop
Use `profiles/dev-demo` (public endpoints, `Consumption_0` APIM, `basic`/`free`
search, `key_vault_purge_protection=false`, throwaway MG name). `terraform apply`
→ demo → `terraform destroy`. With purge protection off and the Consumption APIM
SKU, there's nothing that lingers or blocks an immediate rebuild.
