// CMClient seam (Wave 4 Slice 3) — typed interface for change-management operations.
//
// Mirrors the AIClient five-file pattern:
//   CMClient.ts (this file) → MockCMClient → LiveCMClient
//   → createCMClient factory (index.ts) → server-only adapters in pages/api/v1/cm/change.ts
//
// Security: JIRA_*, SERVICENOW_* credentials are NEVER client-side. MockCMClient
// and LiveCMClient are browser-safe. JiraAdapter and ServiceNowAdapter are defined
// exclusively in the API route — never in src/.
//
// With no env vars, MockCMClient is selected server-side; zero network, no creds required.

/** Supported change-management backends. */
export type CMProvider = 'mock' | 'jira' | 'servicenow';

/** Per-finding governance lifecycle (R3: governance precedes scale). */
export type FindingStatus = 'open' | 'pending_cm' | 'applied';

/** Minimal finding context forwarded when creating a governed change ticket. */
export interface CMFindingInput {
  workloadId: string;
  workloadName: string;
  recommendedAction: string;
  /** USD/mo — included in the ticket description for downstream context. */
  projectedMonthlyImpact: number;
}

/** Result of a successful change ticket creation (normal ITSM path). */
export interface CMTicketResult {
  provider: CMProvider;
  ticketRef: string;
  url: string;
  status: 'created';
  createdAt: string; // ISO 8601
}

/**
 * Audit record attached to a governed finding.
 * Produced by createChange (normal path) or attachReference (pre-approved path).
 */
export interface CMReferenceRecord {
  provider: CMProvider;
  ticketRef: string;
  url: string;
  createdAt: string; // ISO 8601
}

/** Provider-native status of an in-flight change ticket. */
export interface CMStatusResult {
  ticketRef: string;
  /** Provider-native status string — e.g. "In Progress", "Approved", "open". */
  status: string;
  updatedAt: string; // ISO 8601
}

/** Input for attaching a pre-approved reference (STANDARD / pre-approved ITSM path). */
export interface CMAttachInput {
  provider: CMProvider;
  ticketRef: string;
}

/**
 * The CMClient seam interface. The UI calls this; adapters live server-side.
 *
 * @see MockCMClient  — offline/CI-safe default; deterministic refs; zero network
 * @see LiveCMClient  — proxies /api/v1/cm/change; creds never reach the browser
 */
export interface CMClient {
  readonly mode: 'mock' | 'live';
  /**
   * Create a governed change ticket for the given finding and recommended action.
   * Normal ITSM path: finding enters `pending_cm` state after a successful call.
   */
  createChange(finding: CMFindingInput, action: string): Promise<CMTicketResult>;
  /**
   * Validate a pre-approved incident/ticket ref and return an audit record.
   * Pre-approved ITSM path: finding enters `applied` state after a successful call.
   */
  attachReference(input: CMAttachInput): Promise<CMReferenceRecord>;
  /** Poll the live status of a change ticket. */
  getStatus(ticketRef: string): Promise<CMStatusResult>;
}

