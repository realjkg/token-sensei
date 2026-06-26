// FOCUS version primitives for the source-agnostic cost-ingest seam (PR D).
//
// Ratio's canonical internal cost schema targets FOCUS v1.4. Every source may
// export a different FOCUS version (PointFive documents v1.0; private-cloud and
// on-prem exporters may sit anywhere in v1.0-v1.4). The seam upgrades any source
// export UP to the v1.4 canonical model with version-aware, backwards-compatible
// normalization: cross-version deltas are additive (column additions only, no
// breaking changes), per FOCUS's version & conformance rules (focus.finops.org).
//
// NOTE: the per-version column assignment below is a representative model of the
// additive FOCUS deltas. Exact per-version column parity (notably PointFive's
// documented v1.0 -> v1.4 canonical) must be confirmed against a real export
// during trial setup — see the v2 spec's Workstream 2 parity caveat.

export type FocusVersion = '1.0' | '1.1' | '1.2' | '1.3' | '1.4';

/** All supported FOCUS versions, oldest first. */
export const FOCUS_VERSIONS: readonly FocusVersion[] = ['1.0', '1.1', '1.2', '1.3', '1.4'];

/** Ratio's canonical normalization target. */
export const CANONICAL_FOCUS_VERSION: FocusVersion = '1.4';

/** Ordinal rank of a version (0 = oldest), for comparisons. */
export function focusVersionRank(version: FocusVersion): number {
  return FOCUS_VERSIONS.indexOf(version);
}

/** True if `version` is at least `min`. */
export function isAtLeast(version: FocusVersion, min: FocusVersion): boolean {
  return focusVersionRank(version) >= focusVersionRank(min);
}

// Columns introduced by each FOCUS version, on top of the prior version. The
// v1.0 entry is the mandatory/core baseline every source must provide; later
// entries are purely additive. Used both to backfill older sources and to report
// exactly which columns the version shim had to add to reach the canonical model.
export const COLUMNS_BY_VERSION: Record<FocusVersion, readonly string[]> = {
  '1.0': [
    'BilledCost',
    'EffectiveCost',
    'BillingCurrency',
    'BillingPeriodStart',
    'BillingPeriodEnd',
    'ChargePeriodStart',
    'ChargePeriodEnd',
    'BillingAccountId',
    'SubAccountId',
    'ServiceName',
    'ServiceCategory',
    'ProviderName',
    'ChargeCategory',
    'ChargeDescription',
    'ResourceId',
    'PricingQuantity',
    'PricingUnit',
    'UsageQuantity',
    'UsageUnit',
  ],
  '1.1': ['ListCost', 'ContractedCost', 'ConsumedQuantity', 'ConsumedUnit', 'CommitmentDiscountStatus'],
  '1.2': ['ServiceSubcategory', 'InvoiceIssuerName'],
  '1.3': ['SkuMeter', 'PricingCurrency'],
  '1.4': ['CapacityReservationId', 'CapacityReservationStatus'],
};

/** Columns introduced strictly after `version` — i.e. what the shim backfills. */
export function columnsAddedAfter(version: FocusVersion): string[] {
  return FOCUS_VERSIONS.filter((v) => focusVersionRank(v) > focusVersionRank(version)).flatMap(
    (v) => [...COLUMNS_BY_VERSION[v]],
  );
}

