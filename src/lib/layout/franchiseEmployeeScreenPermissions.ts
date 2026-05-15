import { mainMenuItems } from "../global/layout/menuItems";

/**
 * Excluded in Settings → Franchise Employee and My Franchise → Add employee, aligned with
 * `roleAccess` / sidebar (not offered as assignable pages).
 */
export const FRANCHISE_EMPLOYEE_EXCLUDED_SCREEN_KEYS = [
  "content-management",
  "location-management",
  "franchise-management",
  "service-management",
  "settings",
] as const;

export function isFranchiseEmployeeExcludedScreenKey(key: string): boolean {
  return (
    FRANCHISE_EMPLOYEE_EXCLUDED_SCREEN_KEYS as readonly string[]
  ).includes(key);
}

/** Main-nav entries assignable to a franchise employee (label + path from `mainMenuItems`). */
export function getFranchiseEmployeeScreenMenuItems() {
  return mainMenuItems.filter(
    ({ key }) => !isFranchiseEmployeeExcludedScreenKey(key)
  );
}

export function labelForFranchiseEmployeeScreenKey(key: string): string {
  return mainMenuItems.find((item) => item.key === key)?.label ?? key;
}
