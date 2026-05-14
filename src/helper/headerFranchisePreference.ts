import { AppConstant, UserRole } from "../constant/AppConstant";
import { getLocalStorage, setLocalStorage } from "./localStorageHelper";

/** Same-tab listeners (e.g. CustomHeader) when preference changes. */
export const HEADER_FRANCHISE_CHANGED_EVENT = "header-franchise-filter-changed";

/** Sentinel used across the app for “all franchises” in the header filter. */
export function readHeaderFranchisePreference(): string {
  const raw = String(getLocalStorage(AppConstant.headerFranchiseFilter) ?? "").trim();
  if (!raw || raw.toLowerCase() === "all") return "all";
  return raw;
}

export function writeHeaderFranchisePreference(franchiseId: string): void {
  const normalized = String(franchiseId ?? "").trim();
  const stored = !normalized || normalized.toLowerCase() === "all" ? "all" : normalized;
  setLocalStorage(AppConstant.headerFranchiseFilter, stored);
  try {
    window.dispatchEvent(
      new CustomEvent(HEADER_FRANCHISE_CHANGED_EVENT, {
        detail: { franchise_id: stored },
      })
    );
  } catch {
    /* ignore */
  }
}

/**
 * Initial `franchise_id` for pages that use `CustomHeader` + `useFranchiseHeaderForm`.
 *
 * Super admin / staff: last choice from local storage ("all" or a franchise id).
 * Franchise admin / employee: no header dropdown — always the session franchise
 * (`AppConstant.partnerId` is set from `user.franchise_id` at login). Otherwise
 * scoped catalogue calls would incorrectly use global `getAll` while `getCount`
 * still received no `franchise_id`.
 */
export function franchiseHeaderFormDefaults(): { franchise_id: string } {
  const role = String(getLocalStorage(AppConstant.userRole) ?? "").trim();
  if (role === UserRole.FRANCHISE_ADMIN || role === UserRole.EMPLOYEE) {
    const sessionFranchiseId = String(
      getLocalStorage(AppConstant.partnerId) ?? ""
    ).trim();
    if (sessionFranchiseId) return { franchise_id: sessionFranchiseId };
  }
  return { franchise_id: readHeaderFranchisePreference() };
}

/**
 * Super admin (`UserRole.ADMIN`) and staff may send `franchise_id` on list/count APIs to filter by franchise.
 * Franchise admin / employee JWTs are already scoped — the backend returns **403** if they pass this filter.
 */
export function sessionMayUseFranchiseIdApiFilter(): boolean {
  const role = String(getLocalStorage(AppConstant.userRole) ?? "").trim();
  return role === UserRole.ADMIN || role === UserRole.STAFF;
}
