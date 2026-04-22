import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";
import { UserModel } from "../models/UserModel";
import { showLog } from "../helper/utility";
import type { ServerTableSortBy } from "../helper/serverTableSort";
import { shouldUseRealVerificationApi, getMockVerificationListPage } from "../mockData/verificationTableMock";

/** Aligns with Postman "User (New Types)" — `POST /api/user/create` (`type` 5 / 6). */
export const WEB_MANAGEMENT_USER_TYPE = {
  /** Postman: Create Super Admin (web) — used for UI "Franchise Admin". */
  FRANCHISE_ADMIN: 5,
  /**
   * Franchise employee (web). Not in Postman; adjust if backend uses another code.
   * Postman documents `5` (super admin) and `6` (staff) only.
   */
  FRANCHISE_EMPLOYEE: 3,
  /** Postman: Create Staff (web). */
  STAFF: 6,
} as const;

/** Map `mainMenuItems` keys to `accessible_screens` slugs expected by the API (see Postman examples). */
export const mapMenuKeysToAccessibleScreens = (keys: string[]): string[] => {
  const map: Record<string, string> = {
    dashboards: "dashboard",
    "my-franchise": "my_franchise",
    "location-management": "location_management",
    "franchise-management": "franchise_management",
    "service-management": "service_management",
    "user-management": "users",
    "quote-management": "quotes",
    "order-management": "orders",
    financials: "financials",
    "expenses-management": "expenses",
    reports: "reports",
    "partner-management": "subscriptions",
    settings: "settings",
    "support-center": "support",
  };
  const out = (keys ?? [])
    .map((k) => map[k] ?? k.replace(/-/g, "_"))
    .filter(Boolean);
  return out.length ? out : ["dashboard"];
};

export const normalizePhoneForUserCreate = (phone: string): string => {
  const t = (phone ?? "").trim();
  if (!t) return t;
  if (t.startsWith("+")) return t;
  const digits = t.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  return t;
};

export type CreateWebManagementUserBody = {
  name: string;
  email: string;
  phone_number: string;
  type: number;
  is_from_web: boolean;
  created_by_id: string;
  accessible_screens: string[];
  profile_url?: string;
};

/**
 * `POST` `ApiPaths.CREATE_USER` with Postman-style body (web super admin / staff / etc.).
 * Returns parsed `record` when the API succeeds (shape may vary by environment).
 */
export const createWebManagementUser = async (
  body: CreateWebManagementUserBody
): Promise<{ ok: true; record: unknown } | { ok: false }> => {
  const response = await apiRequest(ApiPaths.CREATE_USER, "POST", {
    name: body.name,
    email: body.email,
    phone_number: normalizePhoneForUserCreate(body.phone_number),
    type: body.type,
    is_from_web: body.is_from_web,
    created_by_id: body.created_by_id,
    accessible_screens: body.accessible_screens,
    ...(body.profile_url ? { profile_url: body.profile_url } : {}),
  });

  if (!response.success) {
    return { ok: false };
  }

  const data: any = response.data;
  const record = data?.record ?? data?.data?.record ?? data?.user ?? data;
  return { ok: true, record };
};

/** Re-export: `true` uses `/user/getVerificationAll`; `false` uses mock table data (see `AppConstant.USE_REAL_VERIFICATION_API`). */
export { shouldUseRealVerificationApi } from "../mockData/verificationTableMock";

export const fetchUserDropDown = async (type: number, serviceId?: string
): Promise<{ users: UserModel[]; }> => {
  const params = new URLSearchParams({
    type: String(type),
    ...(serviceId && { service_id: serviceId }),
  });
  const response = await apiRequest(
    `${ApiPaths.GET_USER_DROP_DOWN()}?${params.toString()}`,
    "GET"
  );

  if (response.success) {
    return {
      users: response.data.records,
    };
  } else {
    showLog(response.message || "Failed to fetch user");
    return { users: [] };
  }
};

export const fetchPartnerDropDown = async (serviceId?: string
): Promise<{ partners: UserModel[]; }> => {
  const params = new URLSearchParams({
    ...(serviceId && { service_id: serviceId }),
  });
  const response = await apiRequest(
    `${ApiPaths.GET_PARTNER_DROP_DOWN()}?${params.toString()}`,
    "GET"
  );

  if (response.success) {
    return {
      partners: response.data.records,
    };
  } else {
    showLog(response.message || "Failed to fetch partner");
    return { partners: [] };
  }
};

export type UserListFilters = {
  keyword?: string;
  status?: string;
  sort?: string;
  /** e.g. pending | cleared — sent when backend supports partner wallet filtering */
  wallet_status?: string;
  from_date?: string;
  to_date?: string;
};

export const fetchUser = async (
  isVerification: boolean,
  type: number,
  page: number,
  pageSize: number,
  filters: UserListFilters,
  sortBy: ServerTableSortBy = []
): Promise<{ response: boolean, users: UserModel[]; totalPages: number }> => {
  if (isVerification && !shouldUseRealVerificationApi()) {
    return getMockVerificationListPage(page, pageSize, filters);
  }

  const primarySort = sortBy[0];
  const mappedSortField = (() => {
    if (!primarySort?.id) return undefined;
    if (primarySort.id === "name") {
      return type === 4 ? "user_name" : "partner_name";
    }
    return primarySort.id;
  })();

  const params = new URLSearchParams({
    type: String(type),
    page: String(page),
    limit: String(pageSize),
    ...(filters.keyword && { name: filters.keyword }),
    ...(filters.keyword && { keyword: filters.keyword }),
    ...(filters.keyword && { search: filters.keyword }),
    ...(filters.keyword && { user_name: filters.keyword }),
    ...(filters.keyword && { partner_name: filters.keyword }),
    ...(filters.status && filters.status !== "All" && { is_active: filters.status.toLowerCase() }),
    ...(filters.sort && { sort: filters.sort }),
    ...(filters.wallet_status && filters.wallet_status !== "all" && { wallet_status: filters.wallet_status }),
    ...(filters.from_date && { from_date: filters.from_date }),
    ...(filters.to_date && { to_date: filters.to_date }),
    ...(mappedSortField && { sort_by: mappedSortField }),
    ...(primarySort && { sort_order: primarySort.desc ? "desc" : "asc" }),
    ...(mappedSortField && { sort_field: mappedSortField }),
  });

  const response = await apiRequest(
    `${isVerification ? ApiPaths.GET_VERIFICATION() : ApiPaths.GET_USER()}?${params.toString()}`,
    "GET"
  );

  if (response.success) {
    return {
      response: true,
      users: response.data.records,
      totalPages: response.data.totalPages,
    };
  } else {
    showLog(response.message || "Failed to fetch users");
    return {
      response: false,
      users: [],
      totalPages: 0,
    };
  }
};

export const fetchUserById = async (id: string): Promise<{ response: boolean, user: UserModel | null; }> => {
  const response = await apiRequest(`${ApiPaths.GET_USER_BY_ID()}/${id}`, "GET");
  if (response.success) {
    return {
      response: true,
      user: response.data.record,
    };
  } else {
    return {
      response: false,
      user: null,
    };
  }
};

export const deleteUser = async (id: string): Promise<boolean> => {
  const response = await apiRequest(ApiPaths.DELETE_USER(id), "DELETE");
  if (response.success) {
    return true;
  } else {
    showLog(response.message || "Failed to delete users");
    return false;
  }
};

export const createOrUpdateUser = async (
  payload: any,
  isEditable: boolean,
  id?: string
): Promise<boolean> => {
  const path = isEditable ? ApiPaths.UPDATE_USER(id!) : ApiPaths.CREATE_USER;
  const method = isEditable ? "PUT" : "POST";

  const response = await apiRequest(path, method, payload);
  if (response.success) {
    return true;
  }
  return false;
};
