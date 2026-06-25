# Ratio — Design Specification

**Product:** Ratio (codename: token-sensei)  
**Version:** 1.0 Design Spec  
**Date:** June 24, 2026  
**Author:** Kristian · Adapt Cloud  
**Coding target:** obvious.ai  

---

## 1. Product Purpose

Ratio is an AI-native FinOps platform that governs AI workload spend by measuring value, not just cost. It solves the number-one problem identified by the FinOps community: AI token consumption and spend are the hardest things to forecast and budget because token-based billing is inherently unpredictable.

Ratio does not try to predict unpredictable token spend. Instead, it governs value ratios — which are stable and manageable — while providing developers with guardrails, daily budget profiles, multi-model cost awareness, threshold alerts, and an AI agent they can query for cost intelligence.

### 1.1 Design Principles (Requirements, Not Features)

These four requirements, articulated by Bhaskara Balaga, govern every design decision:

**R1 — Unit economics moves to AI output.** Cost per inference, cost per resolved query, cost per active user, tied to business value. Cost per VM is the wrong abstraction.

**R2 — Demand shaping becomes first-class.** Visibility alone is not enough. The platform must enable action: influence when, how, and whether AI workloads run based on the value they deliver.

**R3 — Governance precedes scale.** Cost and value accountability must be embedded before AI deployment scales. No workload reaches production volume without passing governance gates.

**R4 — Value is the denominator.** Cost without value is just spend. The metric is the ratio of business outcome to inference dollar. Every cost shown in the platform must be paired with its value context.

### 1.2 Target Users

- **FinOps Practitioners** — need daily forecasts, budget profiles, and automated cost reports
- **Developers / ML Engineers** — need guardrails, multi-model cost awareness, and spend thresholds that prevent overruns without blocking work
- **Product Owners** — need value ratios per workload, demand shaping controls, and governance gate status
- **Finance / Leadership** — need portfolio-level value ratios and automated reporting

---

## 2. Data Model

### 2.1 Workload

The core entity. Every AI workload has cost data, output data, and a value ratio.

```
Workload {
  id: string (uuid)
  name: string                        // "Customer Support Agent"
  model: string                       // "gpt-4o", "claude-sonnet-4-20250514", "gemini-2.5-pro"
  model_provider: enum [openai, anthropic, google, aws_bedrock, azure_openai, custom]
  team: string                        // "CX Engineering"
  environment: enum [prod, staging, dev, sandbox]
  
  // --- Unit Economics (R1) ---
  costs: {
    inference_cost_per_call: number   // Current blended cost per inference call
    monthly_spend: number             // Total monthly spend
    daily_spend: number               // Today's spend so far
    daily_budget: number              // Daily budget limit
    monthly_budget: number            // Monthly budget ceiling
    compute: number                   // Compute portion of cost
    tokens_in_today: number           // Input tokens consumed today
    tokens_out_today: number          // Output tokens consumed today
    tokens_in_mtd: number             // Month-to-date input tokens
    tokens_out_mtd: number            // Month-to-date output tokens
  }
  
  // --- Output Metrics (R1) ---
  outputs: {
    daily_inferences: number          // Calls made today
    monthly_inferences: number        // Calls month-to-date
    resolved_queries: number          // Successful outcomes today
    resolution_rate: number           // 0.0–1.0
    active_users_daily: number
    active_users_monthly: number
    csat: number | null               // 1.0–5.0
    avg_handle_time_seconds: number
    deflection_rate: number           // 0.0–1.0 (for support workloads)
  }
  
  // --- Derived Unit Costs (R1 — calculated, not stored) ---
  unit_costs: {
    cost_per_call: number             // costs.daily_spend / outputs.daily_inferences
    cost_per_resolved: number         // costs.daily_spend / outputs.resolved_queries
    cost_per_user: number | null      // costs.monthly_spend / outputs.active_users_monthly
    cost_per_deflection: number | null
    cost_per_1k_tokens_in: number     // Effective input rate
    cost_per_1k_tokens_out: number    // Effective output rate
  }
  
  // --- Value (R4) ---
  value: {
    revenue_protected: number         // Monthly revenue preserved by this workload
    cost_avoided: number              // Monthly cost avoided (e.g., human labor replaced)
    total_value: number               // revenue_protected + cost_avoided
    value_ratio: number               // total_value / costs.monthly_spend
  }
  
  // --- Governance (R3) ---
  governance: {
    policy_check: boolean
    ethics_review: boolean
    cost_approval: boolean
    scale_authorized: boolean
    last_reviewed: datetime
    approved_by: string | null
  }
  
  // --- Demand Shape (R2) ---
  demand_shape: enum [always_on, business_hours, throttled, batch_offpeak, paused, unmanaged]
  priority: enum [critical, high, medium, low]
  
  // --- Trend ---
  cost_trend_pct: number              // Month-over-month cost change percentage
  created_at: datetime
  updated_at: datetime
}
```

### 2.2 Model Registry

Tracks every AI model available in the organization with its pricing, so developers understand multi-model cost tradeoffs.

```
ModelEntry {
  id: string
  provider: enum [openai, anthropic, google, aws_bedrock, azure_openai, custom]
  model_name: string                  // "gpt-4o"
  display_name: string                // "GPT-4o (Global Standard)"
  
  // --- Pricing (per 1M tokens) ---
  pricing: {
    input_per_1m: number              // e.g., 2.50
    output_per_1m: number             // e.g., 10.00
    cached_input_per_1m: number | null
    batch_input_per_1m: number | null
    batch_output_per_1m: number | null
  }
  
  // --- Capability metadata ---
  context_window: number              // 128000
  max_output: number                  // 16384
  supports_vision: boolean
  supports_tools: boolean
  supports_streaming: boolean
  
  // --- Cost tier (derived) ---
  cost_tier: enum [economy, standard, premium, ultra]
  // economy: <$1/1M in | standard: $1–$5 | premium: $5–$20 | ultra: >$20
  
  last_price_update: datetime
}
```

### 2.3 Budget Profile

Daily budget allocation with forecasting.

```
BudgetProfile {
  id: string
  workload_id: string                 // FK to Workload
  period: enum [daily, weekly, monthly]
  
  // --- Limits ---
  budget_amount: number               // e.g., $500/day
  soft_threshold_pct: number          // 0.70 — first alert
  hard_threshold_pct: number          // 0.90 — escalation alert
  kill_threshold_pct: number          // 1.00 — auto-throttle or pause
  
  // --- Daily Profile ---
  daily_allocation: {
    weekday: number                   // Expected daily spend M-F
    weekend: number                   // Expected daily spend Sat-Sun
    peak_hour_start: number           // 9 (9am UTC)
    peak_hour_end: number             // 17 (5pm UTC)
    peak_multiplier: number           // 1.4x during peak hours
  }
  
  // --- Forecast ---
  forecast: {
    projected_daily_spend: number     // Based on current run rate
    projected_monthly_spend: number   // Extrapolated from daily
    projected_end_of_month: number    // Where we'll land
    confidence_interval: {
      low: number                     // 80th percentile low
      high: number                    // 80th percentile high
    }
    days_until_budget_breach: number | null
    forecast_method: enum [linear, weighted_avg_7d, exponential_smoothing]
  }
  
  // --- Actions on threshold breach ---
  on_soft_breach: enum [alert_only, alert_and_log]
  on_hard_breach: enum [alert_escalate, throttle_50pct, throttle_75pct]
  on_kill_breach: enum [pause_workload, throttle_90pct, alert_only]
}
```

### 2.4 Alert

```
Alert {
  id: string
  workload_id: string
  type: enum [
    budget_soft,                      // Hit 70% of daily/monthly budget
    budget_hard,                      // Hit 90%
    budget_kill,                      // Hit 100%
    anomaly_spike,                    // >15% day-over-day spike
    value_ratio_drop,                 // Value ratio fell below threshold
    trend_warning,                    // MoM trend >20%
    governance_missing,               // Workload scaling without gates
    forecast_breach,                  // Forecast says budget will be exceeded
    model_cost_change                 // Provider changed model pricing
  ]
  severity: enum [info, warning, critical]
  message: string
  threshold_value: number
  actual_value: number
  triggered_at: datetime
  acknowledged: boolean
  acknowledged_by: string | null
  action_taken: string | null         // "Throttled to 50%", "Paused", etc.
  channel: enum [in_app, slack, email, webhook]
}
```

### 2.5 Agent Query Log

```
AgentQuery {
  id: string
  user_id: string
  query: string                       // "Why is my spend spiking today?"
  response: string
  workloads_referenced: string[]      // IDs of workloads the agent cited
  tokens_used: { input: number, output: number }
  query_cost: number                  // Cost of this agent call itself
  timestamp: datetime
}
```

---

## 3. Screen Architecture

### 3.1 Layout

Three-panel layout, persistent across all views:

```
┌──────────────────────────────────────────────────────────┐
│  HEADER: Logo · "Ratio" · Portfolio ratio · Total spend  │
│          · Total value · Alerts count                     │
├────────────┬──────────────────────────────┬───────────────┤
│            │                              │               │
│  LEFT      │  CENTER                      │  RIGHT        │
│  280px     │  flex                        │  340px        │
│            │                              │               │
│  Workload  │  Detail view                 │  AI Agent     │
│  list      │  (switches based on context) │  chat panel   │
│            │                              │               │
│  Sorted by │  - Budget profile            │  Quick        │
│  value     │  - Forecast                  │  prompts      │
│  ratio     │  - Multi-model comparison    │               │
│            │  - Governance gates           │  Message      │
│  Filters:  │  - Demand shaping            │  history      │
│  - Team    │  - Alert history             │               │
│  - Model   │  - Unit costs                │  Input        │
│  - Status  │                              │               │
│            │                              │               │
├────────────┴──────────────────────────────┴───────────────┤
│  FOOTER: Alert ticker (scrolling latest alerts)           │
└──────────────────────────────────────────────────────────┘
```

### 3.2 Header Bar

Always visible. Shows portfolio health at a glance.

**Elements (left to right):**
- Logo: "%" symbol in gradient (green → cyan)
- Product name: "Ratio" in mono weight
- Portfolio value ratio: e.g., "25.8× return" in green
- Total monthly spend: e.g., "$34.6k/mo" in red
- Total monthly value: e.g., "$886k/mo" in green
- Active alerts count: e.g., "3 alerts" in amber (clickable → alert panel)

### 3.3 Left Panel — Workload List

Each workload card shows:
- Name (12px, bold)
- Model name + team (10px, muted)
- Value ratio bar: horizontal bar colored by ratio (green >10×, cyan >5×, amber >2×, red <2×)
  - Left label: "{ratio}× return"
  - Right label: context-dependent (spend, unit cost, or value depending on active view toggle)
- 4 governance gate dots (small colored dots: passed = filled, pending = hollow)
- Demand shape label (e.g., "ALWAYS ON" in green, "THROTTLED" in amber)
- Cost trend arrow + percentage

**Filters at top:**
- Toggle buttons: VALUE | COST | UNIT (changes the secondary label on each card)
- Dropdowns or chips for: Team, Model provider, Environment

**Sort:** Default by value ratio descending (worst ratios visible first for action)

### 3.4 Center Panel — Tabbed Detail Views

When a workload is selected, the center panel shows tabbed detail views. Tabs are displayed as minimal text buttons below the workload header.

#### Tab 1: Budget Profile (default view)

This is the primary view that addresses the FinOps community's core ask: accurate daily forecasting.

```
┌─────────────────────────────────────────────────┐
│  [Workload Name]           [Model]  [Team]      │
│  14,200 calls/day          Value: 14.9× return  │
├─────────────────────────────────────────────────┤
│                                                   │
│  TODAY'S BUDGET                                   │
│  ████████████████████░░░░  72% of $500 daily     │
│  $360 spent · $140 remaining · 6.2 hrs left      │
│                                                   │
│  Projected daily close: $485 (97% of budget)     │
│  Confidence: $440 – $530                         │
│                                                   │
│  ─────────────────────────────────────────────   │
│                                                   │
│  MONTHLY FORECAST                                │
│  ████████████░░░░░░░░░░░  48% of $15k monthly   │
│  $7,230 spent · 18 days remaining                │
│  Projected month-end: $13,420 (89% of budget)    │
│                                                   │
│  ─────────────────────────────────────────────   │
│                                                   │
│  TOKEN CONSUMPTION (today)                       │
│  Input:  2.4M tokens  ($7.20 at $3.00/1M)       │
│  Output: 380k tokens  ($5.70 at $15.00/1M)      │
│  Cache:  890k tokens   ($0.89 at $1.00/1M)       │
│  Total:  3.67M tokens  $13.79 so far             │
│                                                   │
│  ─────────────────────────────────────────────   │
│                                                   │
│  THRESHOLDS                                      │
│  70%  Soft alert → Slack + email        [✓ SET]  │
│  90%  Hard alert → Escalate to PO       [✓ SET]  │
│  100% Kill switch → Throttle to 50%     [✓ SET]  │
│                                                   │
└─────────────────────────────────────────────────┘
```

**Budget bar visual spec:**
- Full-width bar, 24px height, rounded corners (4px)
- Background: dark void color
- Fill: gradient left-to-right
  - 0–70%: green
  - 70–90%: amber
  - 90–100%: red
- Projected overshoot: shown as a semi-transparent extension beyond 100% in red

**Forecast calculation (see Section 6).**

#### Tab 2: Multi-Model Comparison

Shows the developer what it would cost to run the same workload on different models. This implements the "multi-model methodology" requirement — developers see the tradeoff between cost, quality, and speed before choosing a model.

```
┌─────────────────────────────────────────────────┐
│  MULTI-MODEL COST COMPARISON                     │
│  Based on today's volume: 14,200 calls           │
│  Avg input: 1,200 tokens · Avg output: 340 tokens│
│                                                   │
│  Current: GPT-4o · $13.79/day · $414/mo          │
│                                                   │
│  MODEL            INPUT    OUTPUT   DAILY   SAVE  │
│  ──────────────────────────────────────────────── │
│  GPT-4o-mini      $0.15    $0.60    $2.42   -82% │
│  Claude Haiku     $0.80    $4.00    $2.84   -79% │
│  Gemini Flash     $0.075   $0.30    $1.52   -89% │
│  Claude Sonnet    $3.00    $15.00   $13.79  base │
│  GPT-4o           $2.50    $10.00   $11.26  -18% │
│  Claude Opus      $15.00   $75.00   $61.50  +346%│
│  GPT-4.5          $75.00   $150.00  $178.50 +1194%│
│                                                   │
│  ⚠ Switching to GPT-4o-mini saves $11.37/day     │
│    ($341/mo) but resolution rate may drop.        │
│    Run an A/B test before switching.              │
│                                                   │
└─────────────────────────────────────────────────┘
```

**Sort:** Default by daily cost ascending (cheapest first).

**Color coding:** Current model highlighted. Models cheaper than current in green. Models more expensive in red. The % savings column uses the same color logic.

#### Tab 3: Governance Gates

Sequential gate checklist (see Section 5 for interaction spec).

#### Tab 4: Demand Shaping Controls

Radio group with 6 options (see data model). Each option shows estimated monthly cost at that shape level. "Always On" is blocked if governance gates are incomplete.

#### Tab 5: Unit Costs

8-metric grid showing per-call, per-resolved, per-user, per-deflection, handle time, satisfaction, trend, and return. Each metric has the value, a label, and a contextual note.

#### Tab 6: Alert History

Chronological list of alerts for this workload. Each shows type icon, message, timestamp, severity badge, and action taken (if any).

### 3.5 Right Panel — AI Agent

Persistent chat interface. The agent has full context of all workloads, budgets, forecasts, and alerts.

**Quick prompt buttons (top):**
- "Why is my spend spiking?"
- "Which model should I switch to?"
- "What's my riskiest workload?"
- "Show today's budget status"

**Chat area:** Scrollable message history. User messages in body font, agent responses in mono font with left border accent. System messages (auto-alerts) in green mono.

**Input:** Mono font text input with send button.

**Agent capabilities (see Section 7 for prompt spec):**
- Answer natural language questions about cost, budget, and forecasts
- Recommend model switches with savings estimates
- Explain why a budget threshold was triggered
- Recommend demand shaping changes with value-at-risk
- Refuse to recommend scaling ungoverned workloads
- Generate automated cost reports on request

### 3.6 Footer — Alert Ticker

Single-line scrolling ticker showing the most recent alerts across all workloads. Format: "[severity icon] [workload name]: [message] · [time ago]". Clickable — navigates to that workload's alert history.

---

## 4. Alert and Threshold System

### 4.1 Budget Thresholds

Every workload has three configurable thresholds on its daily and monthly budget:

| Threshold | Default | Trigger | Action |
|-----------|---------|---------|--------|
| Soft | 70% | Spend reaches 70% of daily/monthly budget | Slack + email notification to workload owner |
| Hard | 90% | Spend reaches 90% | Escalation to PO + workload flagged in UI |
| Kill | 100% | Spend reaches 100% | Auto-throttle to configured level (50%, 75%, or 90%) OR pause |

### 4.2 Anomaly Detection

- Day-over-day spend comparison: if today's projected spend exceeds yesterday's actual by >15%, trigger anomaly alert
- Hour-over-hour within a day: if current hour's token consumption exceeds the same hour yesterday by >25%, trigger intra-day alert
- New model spike: if a workload switches to a more expensive model (detected via cost_per_1k_tokens change), alert immediately

### 4.3 Value Ratio Alerts

- If a workload's value ratio drops below 3×, trigger a "value review" alert
- If a workload's value ratio drops below 2×, trigger a "value critical" alert recommending demand shaping or sunset

### 4.4 Forecast Alerts

- If the monthly forecast (projected_end_of_month) exceeds the monthly budget, trigger a "forecast breach" alert with the projected overshoot amount and days until breach
- If the daily forecast projects hitting the kill threshold before end of business day, trigger immediately

### 4.5 Alert Routing

Configurable per workload:
- In-app: always (default)
- Slack: webhook URL per team/channel
- Email: distribution list per team
- Webhook: custom URL for integration

---

## 5. Governance Gate System

### 5.1 Gate Sequence

Gates are sequential. A workload cannot pass Gate N+1 without Gate N.

```
Gate 1: Policy      →  Gate 2: Ethics    →  Gate 3: Cost      →  Gate 4: Scale
(model allowed?)       (bias/PII safe?)     (within budget?       (cleared for
                                             value ratio OK?)      production volume?)
```

### 5.2 Gate Rules

**Gate 1 — Policy:** Model is on the organization's approved list. Deployment region is allowed. Resource limits are within policy.

**Gate 2 — Ethics:** Bias audit completed. PII handling documented. Output safety review passed.

**Gate 3 — Cost:** Monthly budget is set. Value ratio meets minimum threshold (configurable, default 3×). ROI projection documented.

**Gate 4 — Scale:** All prior gates passed. Scale authorization granted by PO or designated approver. Demand shape must be set to something other than "unmanaged."

### 5.3 Gate Enforcement

- If a workload attempts to increase inference volume by >3× without Gate 4 passed, auto-throttle to previous level and alert
- The demand shaping control "Always On" is blocked unless all 4 gates are passed
- Gate status is checked on every budget profile evaluation (hourly)

---

## 6. Forecast Algorithm

### 6.1 Daily Forecast

```
projected_daily_spend = (spend_so_far / hours_elapsed) × 24

// Adjusted for daily profile:
if current_time < peak_hour_end:
  remaining_peak_hours = peak_hour_end - current_time
  remaining_offpeak_hours = 24 - peak_hour_end
  projected = spend_so_far + (hourly_rate × peak_multiplier × remaining_peak_hours) 
              + (hourly_rate × remaining_offpeak_hours)
else:
  remaining_hours = 24 - current_hour
  projected = spend_so_far + (hourly_rate × remaining_hours)
```

### 6.2 Monthly Forecast

```
// Weighted 7-day average method (default):
avg_daily_7d = sum(daily_spend[last 7 days]) / 7
remaining_days = days_in_month - current_day
projected_eom = spend_mtd + (avg_daily_7d × remaining_days)

// Adjust for weekday/weekend mix in remaining days:
remaining_weekdays = count_weekdays(today, end_of_month)
remaining_weekends = remaining_days - remaining_weekdays
projected_eom = spend_mtd 
  + (daily_allocation.weekday × remaining_weekdays) 
  + (daily_allocation.weekend × remaining_weekends)
```

### 6.3 Confidence Interval

```
std_dev = standard_deviation(daily_spend[last 14 days])
confidence_low = projected_eom - (1.28 × std_dev × sqrt(remaining_days))
confidence_high = projected_eom + (1.28 × std_dev × sqrt(remaining_days))
// 1.28 = z-score for 80% confidence interval
```

### 6.4 Days Until Budget Breach

```
if projected_eom <= monthly_budget:
  days_until_breach = null  // No breach expected
else:
  daily_burn_rate = avg_daily_7d
  remaining_budget = monthly_budget - spend_mtd
  days_until_breach = floor(remaining_budget / daily_burn_rate)
```

---

## 7. Agent Prompt Specification

### 7.1 System Prompt Structure

The agent receives a system prompt that is rebuilt on every query with current workload data:

```
IDENTITY:
You are the Ratio Agent — an AI-native FinOps operator for AI workloads. 
You govern value ratios, not just costs.

PRINCIPLES (non-negotiable):
1. Every cost you cite MUST include its value ratio. 
   "$10k/mo" alone is WRONG. "$10k/mo at 14.2× return" is RIGHT.
2. Never recommend scaling a workload that hasn't passed all 4 governance gates.
3. When asked about budget/forecast, always include: 
   current spend, daily budget, projected close, and confidence interval.
4. When recommending a model switch, always state: 
   cost savings, potential quality impact, and suggestion to A/B test first.
5. When asked to throttle or pause, always state the VALUE that will be lost, 
   not just the cost saved.

WORKLOAD DATA:
[Dynamically injected: all workloads with current costs, budgets, forecasts, 
 value ratios, governance status, demand shape, and alerts]

MODEL REGISTRY:
[Dynamically injected: all available models with current pricing]

ACTIVE ALERTS:
[Dynamically injected: unacknowledged alerts]

CAPABILITIES:
- Explain spend spikes with specific token-level attribution
- Compare models and calculate savings for current workload volume
- Report budget status with forecast and confidence intervals
- Recommend demand shaping with value-at-risk analysis
- Generate daily/weekly cost summary reports
- Answer "what-if" scenarios: "What if I double inference volume?"
```

### 7.2 Example Agent Interactions

**User:** "Why is my spend spiking today?"
**Agent behavior:** Compare today's hourly token consumption against yesterday's same hours. Identify which workload(s) are responsible. Cite specific token counts and cost impact. If caused by a model change, flag it. Always end with the value ratio context.

**User:** "Should I switch to a cheaper model?"
**Agent behavior:** Look up the current workload's model, daily volume, and avg token lengths. Calculate daily/monthly cost on every model in the registry. Present as a comparison table. Flag that cheaper models may reduce resolution rate. Recommend an A/B test. Always show the value ratio impact.

**User:** "Give me today's cost report"
**Agent behavior:** Generate a summary across all workloads: total spend today, each workload's daily budget utilization, any alerts triggered, forecast for month-end, portfolio value ratio. Format as a structured report the user could paste into Slack.

---

## 8. Multi-Model Methodology

### 8.1 Model Cost Awareness

Every developer must see, before deploying or switching a model:
- Input and output token pricing (per 1M tokens)
- Estimated daily and monthly cost at their workload's current volume
- Comparison against 3+ alternative models at the same volume
- The value ratio impact of switching (cheaper model = same value = higher ratio)

### 8.2 Model Selection Guardrails

- If a developer selects a model that would cause daily spend to exceed the daily budget, show a warning with the projected overshoot
- If a developer selects a model in the "ultra" cost tier (>$20/1M input), require Cost Approval gate (Gate 3) to be passed
- If a developer switches models mid-month, the forecast recalculates immediately based on the new model's pricing

### 8.3 Model Cost Tracking

- Track cost_per_1k_tokens_in and cost_per_1k_tokens_out per workload daily
- If a provider changes pricing (detected by comparing stored rates against registry), trigger a "model cost change" alert with the impact on monthly forecast

---

## 9. Automated Cost Reporting

### 9.1 Daily Report (auto-generated, 08:00 UTC)

Delivered to configured channel (Slack/email). Contains:
- Yesterday's total spend across all workloads
- Each workload: spend vs daily budget (% utilization)
- Any alerts triggered yesterday
- Updated monthly forecast with confidence interval
- Portfolio value ratio (current)
- Top 3 workloads by spend and top 3 by value ratio (best and worst)

### 9.2 Weekly Report (auto-generated, Monday 08:00 UTC)

Adds:
- Week-over-week spend trend per workload
- Model cost comparison (did any provider change pricing?)
- Governance gate status changes
- Demand shaping recommendations for workloads trending >20% WoW

### 9.3 On-Demand Reports (via agent)

User can ask the agent: "Generate a cost report for the CX team" or "Show me this month's forecast as a table." Agent formats and delivers in-chat.

---

## 10. Design Tokens

### 10.1 Color System

```
Background:
  void:    #05070b    // Deepest background
  deep:    #090c12    // Panel backgrounds
  slab:    #0d1119    // Card backgrounds
  raised:  #141a26    // Hover states, selected items
  edge:    #1a2235    // Borders
  
Text:
  txt:     #d0d8ea    // Primary text
  sub:     #8895ad    // Secondary text
  dim:     #4d5a72    // Muted text, labels

Semantic:
  value:   #00e09e    // Value, positive, return ratios
  cost:    #ff5c72    // Cost, negative, overspend
  shape:   #ffc44d    // Demand shaping, warnings, amber alerts
  gate:    #7c8dff    // Governance, policy, gates
  unit:    #00ccee    // Unit economics, informational
  purple:  #b490ff    // Agent, AI, special

Cloud providers:
  aws:     #ff9900
  azure:   #0078d4
  gcp:     #4285f4
```

### 10.2 Typography

```
Mono:  "JetBrains Mono" — data, numbers, code, agent responses, labels
Body:  "Instrument Sans" — prose, descriptions, user messages
```

### 10.3 Value Ratio Color Scale

```
Excellent (≥10×): #00e09e (value green)
Good (5–9.9×):    #00ccee (unit cyan)
Marginal (2–4.9×):#ffc44d (shape amber)
Poor (<2×):       #ff5c72 (cost red)
```

### 10.4 Budget Bar Color Scale

```
0–70%:   #00e09e → green (healthy)
70–90%:  #ffc44d → amber (caution)  
90–100%: #ff5c72 → red (danger)
>100%:   #ff5c72 at 40% opacity (overshoot projection)
```

---

## 11. Technical Stack (Recommended)

```
Frontend:     React 18 + TypeScript + Next.js
Styling:      Tailwind CSS (utility-first, matches design tokens)
State:        React Context or Zustand (lightweight)
Agent:        Anthropic Claude API (Sonnet) via fetch
Hosting:      Replit (Sprint 1–3) → Client cloud (Sprint 4+)
Data:         JSON seed data (Sprint 1) → Cloud cost APIs (Sprint 4)
Auth:         None (Sprint 1) → Clerk or Auth0 (Sprint 3+)
```

---

## 12. Implementation Priority

### Sprint 1 — Foundation (Weeks 1–2)

Must-ship for demo:
1. Workload list with value ratio bars
2. Budget profile view (today's budget bar + monthly forecast)
3. Token consumption breakdown (input/output/cache)
4. Threshold indicators (soft/hard/kill as colored markers on budget bar)
5. 4 KPI cards (Value, Spend, Per Query, Per User)
6. Multi-model comparison table (static data, read-only)
7. Seed data for 7 workloads

### Sprint 2 — Governance + Controls (Weeks 3–4)

8. Governance gate checkboxes (sequential enforcement)
9. Demand shaping radio controls
10. Alert list per workload
11. Alert ticker in footer
12. Budget threshold configuration (editable soft/hard/kill percentages)

### Sprint 3 — Agent + Reports (Weeks 5–6)

13. Claude API integration with system prompt
14. Agent chat panel with message history
15. Quick prompt buttons
16. Daily automated report generation (to Slack webhook)
17. On-demand report via agent

### Sprint 4 — Live Data (Weeks 7–8)

18. Azure Cost Management API connector
19. AWS Cost Explorer API connector  
20. Real token consumption tracking
21. Model registry sync (live pricing from providers)
22. Auth + team scoping

---

## 13. Acceptance Criteria Summary

The platform is demo-ready when a FinOps practitioner can:

1. See every AI workload's cost paired with its value ratio (R4)
2. View today's token consumption against a daily budget with a live forecast (core FinOps ask)
3. Compare what the same workload would cost on 5+ different models (multi-model methodology)
4. Set thresholds at 70/90/100% that trigger real alerts (guardrails)
5. Block a workload from scaling until governance gates pass (R3)
6. Change a workload's demand shape and see the cost projection change (R2)
7. Ask the agent "why is my spend spiking?" and get a specific, data-grounded answer (agentic querying)
8. See cost per resolved query, not cost per VM (R1)

If all eight are working, this is not a dashboard. It is a FinOps operating system for AI.

---

## 14. API Specification — Ratio Engine

Ratio is an API-first engine. The UI is a reference implementation. The product is the math. Any dashboard — StitcherAI, OpenOps, Grafana, cloud-native, or custom — can call these endpoints to get value ratios, budget forecasts, governance status, and demand shaping recommendations.

### 14.1 Design Principles

- All endpoints return JSON
- All cost data accepts FOCUS-formatted input for multi-vendor normalization
- Authentication: Bearer token (API key per tenant)
- Rate limits: 1,000 req/min per key (standard), 10,000 (scale), unlimited (enterprise)
- Versioned: `/v1/` prefix, breaking changes get new versions
- Webhook outputs for event-driven integrations

### 14.2 Core Endpoints

```
BASE: https://api.ratio.dev/v1

── WORKLOADS ──────────────────────────────────────────────
GET    /workloads                    List all workloads
POST   /workloads                    Create a workload
GET    /workloads/{id}               Get workload detail (full object)
PATCH  /workloads/{id}               Update workload properties
DELETE /workloads/{id}               Remove a workload

── VALUE RATIO (R4) ───────────────────────────────────────
GET    /workloads/{id}/ratio         Current value ratio + breakdown
  Response: {
    value_ratio: 14.9,
    rating: "excellent",          // excellent|good|marginal|poor
    total_value: 203700,
    monthly_spend: 13632,
    revenue_protected: 114500,
    cost_avoided: 89200,
    trend_7d: [14.2, 14.5, 14.8, 14.6, 14.9, 15.1, 14.9]
  }

GET    /portfolio/ratio              Aggregate portfolio value ratio
  Response: {
    portfolio_ratio: 25.8,
    total_value: 886020,
    total_spend: 34347,
    workload_count: 7,
    below_threshold: 2,           // workloads under 3× ratio
    best: { id, name, ratio },
    worst: { id, name, ratio }
  }

── BUDGET PROFILE ─────────────────────────────────────────
GET    /workloads/{id}/budget        Daily budget status
  Response: {
    daily_budget: 500,
    spent_today: 362,
    pct_used: 0.724,
    remaining: 138,
    hours_remaining: 6.2,
    projected_close: 485,
    threshold_status: "healthy",  // healthy|soft|hard|kill
    thresholds: {
      soft: { pct: 0.70, breached: true, action: "alert_only" },
      hard: { pct: 0.90, breached: false, action: "throttle_50pct" },
      kill: { pct: 1.00, breached: false, action: "pause_workload" }
    }
  }

PATCH  /workloads/{id}/budget        Update budget + thresholds
  Body: {
    daily_budget: 600,
    thresholds: { soft: 0.70, hard: 0.85, kill: 1.00 },
    on_hard_breach: "throttle_50pct"
  }

── FORECAST ───────────────────────────────────────────────
GET    /workloads/{id}/forecast      Monthly forecast + confidence
  Response: {
    method: "weighted_avg_7d",
    spend_mtd: 7230,
    monthly_budget: 15000,
    projected_eom: 13420,
    pct_of_budget: 0.895,
    confidence: { low: 12100, high: 14800 },
    days_until_breach: null,
    daily_burn_rate: 454,
    remaining_days: 18,
    status: "on_track"            // on_track|at_risk|breach_projected
  }

GET    /portfolio/forecast           Aggregate monthly forecast
  Response: {
    total_budget: 45000,
    total_projected: 38200,
    workloads_at_risk: [{ id, name, projected_overshoot }],
    confidence: { low: 34000, high: 42500 }
  }

── GOVERNANCE GATES (R3) ──────────────────────────────────
GET    /workloads/{id}/gates         Gate status
  Response: {
    all_passed: false,
    gates: [
      { id: "policy", passed: true, approved_by: "k.user", at: "..." },
      { id: "ethics", passed: true, approved_by: "j.reviewer", at: "..." },
      { id: "cost", passed: true, approved_by: "m.po", at: "..." },
      { id: "scale", passed: false, reason: "awaiting_approval" }
    ],
    can_scale: false,
    blocked_actions: ["always_on"]
  }

POST   /workloads/{id}/gates/{gate}  Approve a gate
  Body: { approved_by: "k.user" }

DELETE /workloads/{id}/gates/{gate}  Revoke a gate approval

── DEMAND SHAPING (R2) ────────────────────────────────────
GET    /workloads/{id}/shape         Current shape + projections
  Response: {
    current: "business_hours",
    projected_monthly: {
      always_on: 13632,
      business_hours: 10146,
      throttled: 8179,
      batch_offpeak: 4090,
      paused: 0
    },
    available: ["business_hours","throttled","batch_offpeak","paused"],
    blocked: { always_on: "requires_all_gates" }
  }

PATCH  /workloads/{id}/shape         Change demand shape
  Body: { shape: "throttled" }

── MULTI-MODEL COMPARISON (R1) ────────────────────────────
GET    /workloads/{id}/models        Cost comparison across models
  Query: ?volume=daily (default) | monthly | custom&calls=5000
  Response: {
    current_model: "gpt-4o",
    current_daily_cost: 13.79,
    volume: { calls: 14200, avg_in: 1200, avg_out: 340 },
    alternatives: [
      {
        model: "gemini-2.5-flash",
        provider: "google",
        cost_tier: "economy",
        daily_cost: 1.52,
        monthly_cost: 45.60,
        savings_pct: -89,
        quality_note: "Faster but may reduce resolution rate"
      },
      ...
    ]
  }

GET    /models                       Full model registry
GET    /models/{provider}/{name}     Single model pricing detail

── TOKEN CONSUMPTION ──────────────────────────────────────
GET    /workloads/{id}/tokens        Today's token breakdown
  Response: {
    date: "2026-06-24",
    input: { tokens: 2400000, cost: 7.20 },
    output: { tokens: 380000, cost: 5.70 },
    cached: { tokens: 890000, cost: 0.89 },
    total: { tokens: 3670000, cost: 13.79 },
    rate: { input_per_1m: 3.00, output_per_1m: 15.00 }
  }

GET    /workloads/{id}/tokens/history  Historical token data
  Query: ?days=7 | ?from=2026-06-01&to=2026-06-24

── UNIT ECONOMICS (R1) ────────────────────────────────────
GET    /workloads/{id}/unit-costs    Derived unit cost metrics
  Response: {
    cost_per_call: 0.032,
    cost_per_resolved: 0.038,
    cost_per_user: 0.617,
    cost_per_deflection: 0.047,
    cost_per_1k_input: 3.00,
    cost_per_1k_output: 15.00,
    resolution_rate: 0.831,
    csat: 4.2
  }

── ALERTS ─────────────────────────────────────────────────
GET    /alerts                       List alerts (filterable)
  Query: ?workload={id}&severity=critical&acknowledged=false
GET    /alerts/{id}                  Single alert detail
PATCH  /alerts/{id}/acknowledge      Acknowledge an alert
POST   /alerts/config                Configure alert routing
  Body: {
    workload_id: "...",
    channels: [
      { type: "slack", webhook: "https://..." },
      { type: "email", to: "finops@company.com" }
    ]
  }

── AGENT ──────────────────────────────────────────────────
POST   /agent/query                  Natural language query
  Body: {
    query: "Why is my spend spiking today?",
    persona: "developer",         // developer|po|finops|finance
    context: { workload_id: "..." }  // optional focus
  }
  Response: {
    answer: "Your Support Agent workload...",
    workloads_cited: ["wl-001"],
    tokens_used: { input: 1200, output: 340 },
    query_cost: 0.0087
  }

── REPORTS ────────────────────────────────────────────────
POST   /reports/daily                Generate daily cost report
POST   /reports/weekly               Generate weekly cost report
GET    /reports/{id}                 Retrieve a generated report
  Response: { format: "markdown|json|html", content: "..." }
```

### 14.3 Webhook Events (Push)

Configure webhook endpoints to receive real-time events:

```
POST /webhooks
  Body: {
    url: "https://your-endpoint.com/ratio-events",
    events: ["alert.triggered", "forecast.breach", "ratio.drop", "gate.blocked"],
    secret: "your-signing-secret"
  }

Event payloads:

alert.triggered
  { event: "alert.triggered", workload_id, alert_type, severity,
    threshold: 0.90, actual: 0.92, message, timestamp }

forecast.breach
  { event: "forecast.breach", workload_id, monthly_budget,
    projected_eom, overshoot_amount, days_until_breach, timestamp }

ratio.drop
  { event: "ratio.drop", workload_id, previous_ratio,
    current_ratio, threshold: 3.0, timestamp }

gate.blocked
  { event: "gate.blocked", workload_id, attempted_action,
    missing_gates: ["ethics","cost"], timestamp }

shape.changed
  { event: "shape.changed", workload_id, previous, current,
    projected_monthly_impact, changed_by, timestamp }

model.price.changed
  { event: "model.price.changed", provider, model,
    previous_input_rate, new_input_rate,
    affected_workloads: [{ id, monthly_impact }], timestamp }
```

### 14.4 Integration Patterns

```
── StitcherAI ──────────────────────────────────
StitcherAI normalizes cost data via FOCUS spec.
Ratio consumes FOCUS-formatted data as input.
StitcherAI's reasoning engine calls Ratio's /ratio,
/forecast, and /agent endpoints to add value context
to the financial decisions it embeds in workflows.

── OpenOps ─────────────────────────────────────
OpenOps workflow step calls Ratio's /gates endpoint
to check governance before executing scale actions.
Ratio webhooks trigger OpenOps workflows on
threshold breaches or forecast alerts.

── Grafana ─────────────────────────────────────
Ratio exposes a /metrics endpoint (Prometheus format)
for value ratios, budget utilization, and forecast
accuracy. Grafana scrapes and visualizes.

── Slack / Teams ───────────────────────────────
Slash command (/ratio) calls /agent/query endpoint.
Webhooks deliver alerts to configured channels.

── IDE Extensions ──────────────────────────────
VS Code extension calls /workloads/{id}/models
when developer selects a model in code, showing
cost comparison inline.

── Cloud Native ────────────────────────────────
Azure Monitor / CloudWatch custom metrics
ingested from Ratio's /metrics endpoint.
Native alerting rules can reference Ratio data.

── Customer's Own UI ───────────────────────────
React SDK wraps the API with typed hooks:
  useWorkloads(), useRatio(id), useBudget(id),
  useForecast(id), useGates(id), useAgent()
Ships as @ratio/react on npm.
```

### 14.5 FOCUS Compliance

Ratio accepts cost data in FOCUS format as input:

```
POST /ingest/focus
  Body: FOCUS-compliant billing rows
  Headers: Content-Type: application/json

Ratio maps FOCUS columns to its internal model:
  BillingAccountId     → tenant
  SubAccountId         → workload.cloud_account
  ServiceName          → workload.model_provider
  ResourceId           → workload.resource
  BilledCost           → workload.costs
  EffectiveCost        → workload.costs (discount-adjusted)
  UsageQuantity        → workload.tokens
  PricingUnit          → workload.unit_costs derivation
```

This means any organization that exports FOCUS-formatted billing data — from any cloud provider, any AI service, or any tool like StitcherAI that normalizes to FOCUS — can feed Ratio without custom integration work.

---

## 15. Acceptance Criteria (Updated)

The platform is demo-ready when a FinOps practitioner can:

1. See every AI workload's cost paired with its value ratio (R4)
2. View today's token consumption against a daily budget with a live forecast (core FinOps ask)
3. Compare what the same workload would cost on 5+ different models (multi-model methodology)
4. Set thresholds at 70/90/100% that trigger real alerts (guardrails)
5. Block a workload from scaling until governance gates pass (R3)
6. Change a workload's demand shape and see the cost projection change (R2)
7. Ask the agent "why is my spend spiking?" and get a specific, data-grounded answer (agentic querying)
8. See cost per resolved query, not cost per VM (R1)
9. Call any of the above via REST API from a non-Ratio client (API-first)
10. Receive webhook events in Slack/email when thresholds breach (push integration)

Ratio is not a dashboard. It is a FinOps engine for AI — with a reference UI.

---

## 16. Positioning & Integration Principle

**Ratio is a complementary, open, embeddable value-and-governance layer — not a competing dashboard.** This is a product tenet, not a feature. It governs how Ratio relates to adjacent tooling and how its outputs reach people.

### 16.1 Complement, Don't Replace (attribution tools)

High-resolution cost-attribution tools — eBPF-based or packet-based taggers such as attribute.io — answer **what did it cost and who/what consumed it** at fine grain (process, pod, packet). That is the expensive, infrastructure-level *numerator*.

Ratio does **not** do kernel-level capture and must never try to replace it. Ratio's job is the layer above:

```
Attribution tools (eBPF / packet tagging)   Ratio
─────────────────────────────────────────   ─────────────────────────────────
WHAT did it cost, and WHO/what consumed it → WAS it worth it (value ratio, R4)
(numerator, high-resolution)                 SHOULD it scale (governance, R3)
                                             WHERE is it heading (forecast)
                                             HOW to shape demand (R2)
```

Ratio **consumes** attribution output as a cost source and attaches the value denominator, governance gates, forecast, and demand shaping. They answer "what did it cost"; Ratio answers "was it worth it, and should it grow." The two compose through one normalized cost interface — they do not compete.

### 16.2 Publish, Don't Aggregate (the anti-"7 dashboards" rule)

There are two ways to fight dashboard sprawl:

- **(A) Consolidation surface** — one pane that pulls everything in. This is still a competing dashboard, just a larger one. **Rejected.**
- **(B) Embeddable engine** — Ratio's value/governance/forecast outputs surface *inside the tools each persona already uses.* No new dashboard. **This is the design.**

Ratio is API-first (§14): the UI is a reference implementation; the product is the math. Outputs are delivered, not centralized:

- **Grafana** scrapes Ratio's `/metrics` (Prometheus) — value ratios and forecast accuracy appear on the analyst's existing board.
- **Slack/Teams** slash command → `/agent/query` — managers ask "what's our riskiest workload?" in the channel they already use.
- **`@ratio/react` SDK** (`useRatio`, `useForecast`, `useGates`) — the value lens renders inline in a team's existing FinOps/FOCUS tooling.
- **Webhooks** (§14.3) push `forecast.breach` / `ratio.drop` / `gate.blocked` into whatever already alerts the owner.

No one is asked to open a 7th dashboard; the value and governance numbers ride into the surface they already check.

### 16.3 One Source of Truth, Persona-Projected

Different personas need different lenses on the **same numbers**. One engine, persona-shaped projections (generalizing the `persona` parameter on `/agent/query`, §14.2):

| Persona | Lens they need | Same underlying engine output |
| --- | --- | --- |
| Data analyst | granularity, trends, raw `/metrics` | value ratio + token attribution |
| FOCUS billing specialist | FOCUS-normalized rows, reconciliation | `/ingest/focus` in, unit-cost math out |
| Procurement / business manager | value ratios, forecast, governance status | `/portfolio/ratio`, `/forecast`, `/gates` |

Nobody gets a divergent copy of the truth — they get the same engine output projected to their role and delivered to their tool.

### 16.4 Two Ingest Doors, One Internal Model

To stay open and composable, all external cost data enters through one normalized model (§2, §14.5) via two doors:

1. **`/ingest/focus`** — FOCUS-formatted rows from any cloud or tool that exports the FinOps spec (see §14.5).
2. **Attribution-source adapter** — a thin connector that maps an attribution tool's tagged cost output (e.g., attribute.io) into the same internal cost rows, ideally normalized to FOCUS so it rides the existing mapper. The attribution tool supplies high-resolution cost + workload identity; Ratio attaches value, governance, and forecast.

The engine, forecasts, value ratios, and UI remain provider- and source-agnostic. Only the adapter (auth, fetch, identity resolution) is source-specific — see the connector pattern in §14.4.

---

*End of specification.*
