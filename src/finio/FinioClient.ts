// FinIO seam — mirrors src/hello/HelloClient.ts. Defines the wire schema
// (FOCUS v1.1 subset + x_Ratio* value extensions) and the FinioClient
// interface both mock and live implementations satisfy.
//
// FOCUS column names follow the v1.1 spec (focus.finops.org). x_Ratio* columns
// are FOCUS-legal vendor extensions (see §3.2 of the spec).

export type FocusVersion = '1.1';

/** Representative FOCUS v1.1 row — mandatory cost/currency/period columns
 *  plus Ratio value-extension columns. Not all 100+ FOCUS columns; v1 subset. */
export interface FocusRow {
  // --- FOCUS mandatory / core ---
  BilledCost: number;         // Decimal, non-null, denominated in BillingCurrency
  EffectiveCost: number;      // Amortised cost (= BilledCost in v1 — no commitments)
  BillingCurrency: string;    // e.g. 'USD'
  BillingPeriodStart: string; // ISO 8601
  BillingPeriodEnd: string;   // ISO 8601
  ChargePeriodStart: string;  // ISO 8601
  ChargePeriodEnd: string;    // ISO 8601
  ServiceName: string;        // e.g. 'Claude Sonnet 4'
  ServiceCategory: string;    // e.g. 'AI and Machine Learning'
  ProviderName: string;       // e.g. 'anthropic' (v1.3 renames → ServiceProviderName)
  ChargeDescription: string;

  // --- Ratio value extensions (FOCUS-legal x_ columns) ---
  x_RatioWorkloadId: string;
  x_RatioValueRatio: number;       // value.value_ratio
  x_RatioTotalValue: number;       // value.total_value, in BillingCurrency
  x_RatioDemandShape: string;      // DemandShape enum value
  x_RatioGovernanceGates: number;  // 0–4 governance gates passed
}

export interface FinioExport {
  focusVersion: FocusVersion;
  generatedAt: string; // ISO 8601
  rows: FocusRow[];
}

export interface HandshakeRequest {
  agentId: string;
  capabilities: string[]; // e.g. ['finio.export']
  focusVersion: FocusVersion;
  nonce: string;
}

export interface HandshakeResult {
  sessionId: string;
  accepts: string[];      // operations the peer will honour
  focusVersion: FocusVersion;
  expiresAt: string;      // ISO 8601
}

export interface FinioClient {
  readonly mode: 'mock' | 'live';
  handshake(req: HandshakeRequest): Promise<HandshakeResult>;
  export(sessionId: string): Promise<FinioExport>;
}

/** Shared bearer token for the demo handshake. Both the LiveFinioClient and
 *  the /api/a2a/handshake route import this constant — keeping the trust
 *  boundary visible without standing up real auth infrastructure. */
export const FINIO_DEMO_TOKEN = 'ratio-a2a-v1';

