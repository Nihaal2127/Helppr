import { UserRole } from "../constant/AppConstant";

const STAFF_DENIED_PREFIXES = [
  "/content-management",
  "/location-management",
  "/franchise-management",
  "/service-management",
] as const;

function matchesPrefix(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

function keyForPath(pathname: string): string | null {
  const p = pathname.split("?")[0] || "";
  let hit: { key: string; len: number } | null = null;
  for (const [key, home] of Object.entries(MENU_KEY_ENTRY)) {
    if (!matchesPrefix(p, home)) continue;
    if (!hit || home.length > hit.len) hit = { key, len: home.length };
  }
  return hit?.key ?? null;
}

function isStaffDeniedPath(pathname: string): boolean {
  for (const p of STAFF_DENIED_PREFIXES) {
    if (matchesPrefix(pathname, p)) return true;
  }
  if (pathname === "/settings" || pathname.startsWith("/settings-")) return true;
  return false;
}

function isEmployeeDeniedPath(pathname: string): boolean {
  if (isStaffDeniedPath(pathname)) return true;
  if (matchesPrefix(pathname, "/my-franchise")) return true;
  if (matchesPrefix(pathname, "/expenses")) return true;
  if (pathname === "/financial" || pathname.startsWith("/financial-")) return true;
  return false;
}

function isAdminDeniedPath(pathname: string): boolean {
  return matchesPrefix(pathname, "/my-franchise");
}

/**
 * For authenticated users only. Use after confirming `authToken` exists.
 * @returns `true` if the current role may open this URL.
 */
export function isAuthenticatedPathAllowed(
  pathname: string,
  role: string | null,
  allowedMenuKeys?: Set<string> | null
): boolean {
  const p = pathname.split("?")[0] || "";

  if (p === "/profile" || p.startsWith("/profile/")) return true;

  const r = (role && String(role).trim()) || UserRole.EMPLOYEE;

  if (r === UserRole.ADMIN) {
    return !isAdminDeniedPath(p);
  }
  if (r === UserRole.FRANCHISE_ADMIN) {
    // Franchise admin access is fixed by role, not per-user screen payload.
    return true;
  }
  if (r === UserRole.STAFF) {
    return !isStaffDeniedPath(p);
  }
  if (r === UserRole.EMPLOYEE) {
    if (isEmployeeDeniedPath(p)) return false;
  } else if (r !== UserRole.ADMIN && r !== UserRole.FRANCHISE_ADMIN && r !== UserRole.STAFF) {
    if (isEmployeeDeniedPath(p)) return false;
  }

  if (allowedMenuKeys && allowedMenuKeys.size > 0) {
    const key = keyForPath(p);
    if (key && !allowedMenuKeys.has(key)) return false;
  }
  return true;
}

/** One representative path per sidebar item — must stay in sync with `menuItems.ts` paths. */
const MENU_KEY_ENTRY: Record<string, string> = {
  dashboards: "/dashboard",
  "my-franchise": "/my-franchise",
  "location-management": "/location-management",
  "franchise-management": "/franchise-management",
  "service-management": "/service-management",
  "user-management": "/user-management",
  "quote-management": "/quote-management",
  "order-management": "/order-management",
  financials: "/financial",
  "expenses-management": "/expenses",
  reports: "/reports",
  "partner-management": "/partner-management",
  settings: "/settings",
  "support-center": "/ticket-management",
  notifications: "/notifications",
  "content-management": "/content-management",
  calendar: "/calendar",
};

/**
 * Whether a main-nav item may be shown in the sidebar for the given role
 * (same rules as `isAuthenticatedPathAllowed` for that item’s home path).
 */
export function isMainMenuItemVisibleForRole(
  key: string,
  role: string | null,
  allowedMenuKeys?: Set<string> | null
): boolean {
  const home = MENU_KEY_ENTRY[key];
  if (!home) return true;
  return isAuthenticatedPathAllowed(home, role, allowedMenuKeys);
}

export function parseAllowedMenuKeys(raw: string | null): Set<string> {
  if (!raw) return new Set();
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.map((x) => String(x || "").trim()).filter(Boolean));
  } catch {
    return new Set();
  }
}

export function getDefaultAuthorizedPath(
  role: string | null,
  allowedMenuKeys?: Set<string> | null
): string {
  const preferred = ["/dashboard", "/order-management", "/reports", "/profile"];
  for (const p of preferred) {
    if (isAuthenticatedPathAllowed(p, role, allowedMenuKeys)) return p;
  }
  return "/profile";
}
