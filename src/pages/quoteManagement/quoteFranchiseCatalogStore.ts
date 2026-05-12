export type QuoteFranchiseCatalogSnapshot = {
  partnerRecords: Record<string, unknown>[];
  employeeRows: Record<string, unknown>[];
};

let snapshot: QuoteFranchiseCatalogSnapshot | null = null;

export function setQuoteFranchiseCatalogSnapshot(
  next: QuoteFranchiseCatalogSnapshot | null
): void {
  snapshot = next;
}

export function getQuoteFranchiseCatalogSnapshot(): QuoteFranchiseCatalogSnapshot | null {
  return snapshot;
}
