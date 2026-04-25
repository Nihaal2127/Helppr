import {
  ExpenseCategoryModel,
  OfferModel,
  RoleSettingsModel,
  StaffSettingsModel,
} from "../models/SettingsModel";
import { offersMockSeed } from "../mockData/settingsOffersMockData";
import { rolesMockSeed } from "../mockData/settingsRolesMockData";
import { staffMockSeed } from "../mockData/settingsStaffMockData";
import { expenseCategoriesMockSeed } from "../mockData/settingsExpenseCategoryMockData";
import { AppConstant } from "../constant/AppConstant";
import { getLocalStorage } from "../helper/localStorageHelper";
import { showErrorAlert } from "../helper/alertHelper";
import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";
import {
  createWebManagementUser,
  menuKeysFromUserAccess,
  mapMenuKeysToAvailablePages,
  staffAvailablePagesFromMenuKeys,
  WEB_MANAGEMENT_USER_TYPE,
} from "./userService";

const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

// ----------------------
// Offer mock data (in-memory, no localStorage)
// ----------------------

let mockOffers: OfferModel[] = offersMockSeed.map((item, index) => {
  const now = new Date().toISOString();
  return {
    ...item,
    id: `${Date.now()}-${index}`,
    createdAt: now,
    startDate: item.startDate || now,
    endDate: item.endDate || now,
  };
});

let mockRoles: RoleSettingsModel[] = rolesMockSeed.map((item, index) => {
  const now = new Date().toISOString();
  return {
    ...item,
    id: `${Date.now()}-role-${index}`,
    createdDate: now,
  };
});

let mockExpenseCategories: ExpenseCategoryModel[] = expenseCategoriesMockSeed.map(
  (item, index) => {
    const now = new Date().toISOString();
    return {
      ...item,
      id: `${Date.now()}-expense-category-${index}`,
      createdDate: now,
    };
  }
);

let mockStaff: StaffSettingsModel[] = staffMockSeed.map((item, index) => {
  const now = new Date().toISOString();
  return {
    ...item,
    id: `${Date.now()}-staff-${index}`,
    createdDate: now,
  };
});

// Kept for backward compatibility with existing page calls.
export const ensureSettingsSeedData = () => {};

// Offers API (mock, in-memory)

export const getOffers = (): OfferModel[] => {
  return [...mockOffers];
};

export const saveOffer = (
  payload: Omit<OfferModel, "id" | "createdAt">,
  id?: string
) => {
  if (id) {
    mockOffers = mockOffers.map((item) =>
      item.id === id ? { ...item, ...payload } : item
    );
    return;
  }

  const now = new Date().toISOString();
  const newOffer: OfferModel = {
    ...payload,
    id: generateId(),
    createdAt: now,
    startDate: payload.startDate || now,
    endDate: payload.endDate || now,
  };

  mockOffers = [newOffer, ...mockOffers];
};

export const voidOffer = (id: string) => {
  mockOffers = mockOffers.map((item) =>
    item.id === id ? { ...item, status: "inactive" as const } : item
  );
};

export const getRoles = (): RoleSettingsModel[] => [...mockRoles];
export const saveRole = (
  payload: Omit<RoleSettingsModel, "id" | "createdDate">,
  id?: string,
  opts?: { newId?: string }
) => {
  if (id) {
    mockRoles = mockRoles.map((item) =>
      item.id === id ? { ...item, ...payload } : item
    );
    return;
  }

  mockRoles = [
    {
      ...payload,
      id: opts?.newId ?? generateId(),
      createdDate: new Date().toISOString(),
    },
    ...mockRoles,
  ];
};
export const voidRole = (id: string) => {
  mockRoles = mockRoles.map((item) =>
    item.id === id ? { ...item, status: "inactive" as const } : item
  );
};

export const getStaff = (): StaffSettingsModel[] => [...mockStaff];

type SettingsRoleStaffApiData = {
  roles: RoleSettingsModel[];
  staff: StaffSettingsModel[];
};

function normalizeActiveStatus(raw: unknown): "active" | "inactive" {
  if (raw === true || raw === 1 || String(raw).toLowerCase() === "active") return "active";
  if (raw === false || raw === 0 || String(raw).toLowerCase() === "inactive") return "inactive";
  return "active";
}

function mapApiUserToRoleSettingsModel(raw: Record<string, unknown>, roleType: "franchise_admin" | "employee"): RoleSettingsModel {
  const id = String(raw._id ?? raw.id ?? generateId());
  const roleId = String(raw.user_id ?? raw.userId ?? raw.role_id ?? id);
  const name = String(raw.name ?? raw.role_name ?? "-");
  const perms = menuKeysFromUserAccess(raw);
  return {
    id,
    roleId,
    roleName: name,
    roleType,
    assignedFranchise: String(raw.franchise_name ?? raw.assigned_franchise ?? "").trim() || undefined,
    email: String(raw.email ?? "").trim() || undefined,
    phone_number: String(raw.phone_number ?? "").trim() || undefined,
    profile_url: String(raw.profile_url ?? "").trim() || undefined,
    status: normalizeActiveStatus(raw.is_active),
    createdDate: String(raw.created_at ?? new Date().toISOString()),
    screenPermissions: perms,
  };
}

function mapApiUserToStaffSettingsModel(raw: Record<string, unknown>): StaffSettingsModel {
  const id = String(raw._id ?? raw.id ?? generateId());
  const staffId = String(raw.user_id ?? raw.userId ?? raw.staff_id ?? id);
  return {
    id,
    staffId,
    name: String(raw.name ?? "-"),
    email: String(raw.email ?? "").trim() || undefined,
    phone_number: String(raw.phone_number ?? "").trim() || undefined,
    profile_url: String(raw.profile_url ?? "").trim() || undefined,
    status: normalizeActiveStatus(raw.is_active),
    createdDate: String(raw.created_at ?? new Date().toISOString()),
    screenPermissions: menuKeysFromUserAccess(raw),
    allFranchises: true,
    franchisePermissions: [],
  };
}

async function fetchAllUsersByType(type: number): Promise<Record<string, unknown>[] | null> {
  const limit = 100;
  const maxPages = 30;
  const all: Record<string, unknown>[] = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      type: String(type),
      _ts: String(Date.now()),
    });
    const res = await apiRequest(`${ApiPaths.GET_USER()}?${params.toString()}`, "GET", undefined, false, true, true);
    if (!res.success) return null;
    const d = (res.data ?? {}) as Record<string, unknown>;
    const records =
      (Array.isArray((d.data as Record<string, unknown> | undefined)?.records)
        ? (d.data as Record<string, unknown>).records
        : Array.isArray(d.records)
          ? d.records
          : []) as Record<string, unknown>[];
    all.push(...records);
    const totalPagesRaw =
      (d.data as Record<string, unknown> | undefined)?.totalPages ?? d.totalPages ?? 1;
    const totalPages = Number(totalPagesRaw);
    if (!Number.isFinite(totalPages) || page >= totalPages) break;
  }
  return all;
}

/**
 * Load settings-role members from `/user/getAll` using dashboard user list `type=4`,
 * then split by each record's actual `type` (1/3/6).
 */
export const fetchRoleAndStaffFromApi = async (): Promise<SettingsRoleStaffApiData | null> => {
  const allDashboardMembers = await fetchAllUsersByType(4);
  if (!allDashboardMembers) return null;
  const admins = allDashboardMembers.filter(
    (u) => Number((u as Record<string, unknown>).type) === WEB_MANAGEMENT_USER_TYPE.FRANCHISE_ADMIN
  );
  const employees = allDashboardMembers.filter(
    (u) => Number((u as Record<string, unknown>).type) === WEB_MANAGEMENT_USER_TYPE.FRANCHISE_EMPLOYEE
  );
  const staff = allDashboardMembers.filter(
    (u) => Number((u as Record<string, unknown>).type) === WEB_MANAGEMENT_USER_TYPE.STAFF
  );
  const mapped: SettingsRoleStaffApiData = {
    roles: [
      ...admins.map((u) => mapApiUserToRoleSettingsModel(u, "franchise_admin")),
      ...employees.map((u) => mapApiUserToRoleSettingsModel(u, "employee")),
    ],
    staff: staff.map(mapApiUserToStaffSettingsModel),
  };
  // Keep existing `getRoles/getStaff/save*` flow consistent with API-loaded data.
  mockRoles = mapped.roles.map((r) => ({ ...r }));
  mockStaff = mapped.staff.map((s) => ({ ...s }));
  return mapped;
};

/**
 * Fetch only one settings-role section using a specific `type` query.
 * - 1: franchise admin
 * - 3: franchise employee
 * - 6: staff
 */
export const fetchSettingsSectionByType = async (
  type: number
): Promise<{ roles: RoleSettingsModel[]; staff: StaffSettingsModel[] } | null> => {
  const mapRows = (rows: Record<string, unknown>[]) => {
    if (type === WEB_MANAGEMENT_USER_TYPE.FRANCHISE_ADMIN) {
      return {
        roles: rows.map((u) => mapApiUserToRoleSettingsModel(u, "franchise_admin")),
        staff: [] as StaffSettingsModel[],
      };
    }
    if (type === WEB_MANAGEMENT_USER_TYPE.FRANCHISE_EMPLOYEE) {
      return {
        roles: rows.map((u) => mapApiUserToRoleSettingsModel(u, "employee")),
        staff: [] as StaffSettingsModel[],
      };
    }
    if (type === WEB_MANAGEMENT_USER_TYPE.STAFF) {
      return {
        roles: [] as RoleSettingsModel[],
        staff: rows.map(mapApiUserToStaffSettingsModel),
      };
    }
    return { roles: [] as RoleSettingsModel[], staff: [] as StaffSettingsModel[] };
  };

  const rows = await fetchAllUsersByType(type);
  if (rows && rows.length > 0) {
    return mapRows(rows);
  }

  // Fallback: some environments fail/empty on specific type calls but succeed on dashboard list type=4.
  const allDashboardMembers = await fetchAllUsersByType(4);
  if (!allDashboardMembers) return null;
  const filtered = allDashboardMembers.filter(
    (u) => Number((u as Record<string, unknown>).type) === Number(type)
  );
  return mapRows(filtered);
};

export const saveStaff = (
  payload: Omit<StaffSettingsModel, "id" | "createdDate">,
  id?: string,
  opts?: { newId?: string }
) => {
  if (id) {
    mockStaff = mockStaff.map((item) =>
      item.id === id ? { ...item, ...payload } : item
    );
    return;
  }

  mockStaff = [
    {
      ...payload,
      id: opts?.newId ?? generateId(),
      createdDate: new Date().toISOString(),
    },
    ...mockStaff,
  ];
};

function profileUrlForApi(profileUrl?: string): string | undefined {
  const u = (profileUrl ?? "").trim();
  if (!u || u.startsWith("uploads/")) return undefined;
  return u;
}

function pickRecordId(record: Record<string, unknown> | null | undefined): string | undefined {
  if (!record) return undefined;
  const id = record._id ?? record.id;
  return id != null ? String(id) : undefined;
}

function sanitizeStatus(status?: string): "active" | "inactive" {
  return String(status ?? "active").toLowerCase() === "inactive" ? "inactive" : "active";
}

function updateStatusPayloadValue(status?: string): boolean {
  return sanitizeStatus(status) === "active";
}

function normalizedPagesFromPermKeys(keys: string[]) {
  return mapMenuKeysToAvailablePages(keys);
}

/**
 * Create franchise admin / franchise employee via `POST /user/create` (Postman web types),
 * then append to in-memory list for the settings UI.
 */
export const createRoleUserWithApi = async (
  payload: Omit<RoleSettingsModel, "id" | "createdDate">
): Promise<boolean> => {
  const createdById = (getLocalStorage(AppConstant.createdById) ?? "").trim();
  if (!createdById) {
    showErrorAlert("Missing session (created_by_id). Please log in again.");
    return false;
  }

  const type =
    payload.roleType === "franchise_admin"
      ? WEB_MANAGEMENT_USER_TYPE.FRANCHISE_ADMIN
      : WEB_MANAGEMENT_USER_TYPE.FRANCHISE_EMPLOYEE;

  const permKeys = payload.screenPermissions ?? [];
  const commonBody = {
    name: payload.roleName.trim(),
    email: (payload.email ?? "").trim(),
    phone_number: (payload.phone_number ?? "").trim(),
    type,
    status: (payload.status ?? "active").toLowerCase(),
    is_from_web: true,
    created_by_id: createdById,
    profile_url: profileUrlForApi(payload.profile_url),
  };
  const result = await createWebManagementUser(
    payload.roleType === "franchise_admin"
      ? {
          ...commonBody,
          // Franchise admin screens are fixed by role; do not send screen list payload.
        }
      : {
          ...commonBody,
          available_pages: mapMenuKeysToAvailablePages(permKeys),
        }
  );

  if (!result.ok) return false;

  const raw = result.record as Record<string, unknown> | null | undefined;
  const serverId = pickRecordId(raw);
  const roleId = String(raw?.user_id ?? raw?.userId ?? payload.roleId ?? serverId ?? generateId());
  const isActive = raw?.is_active !== false;

  saveRole(
    {
      ...payload,
      roleId,
      roleName: String(raw?.name ?? payload.roleName),
      email: (raw?.email as string | undefined) ?? payload.email,
      phone_number: (raw?.phone_number as string | undefined) ?? payload.phone_number,
      profile_url: (raw?.profile_url as string | undefined) ?? payload.profile_url,
      status: isActive ? "active" : "inactive",
    },
    undefined,
    serverId ? { newId: serverId } : undefined
  );
  return true;
};

/** Update franchise admin / franchise employee via `PUT /user/update/:id`. */
export const updateRoleUserWithApi = async (
  id: string,
  payload: Omit<RoleSettingsModel, "id" | "createdDate">
): Promise<boolean> => {
  const userId = String(id || "").trim();
  if (!userId) return false;

  const isFranchiseAdmin = payload.roleType === "franchise_admin";
  const permKeys = payload.screenPermissions ?? [];
  const availablePages = normalizedPagesFromPermKeys(permKeys);

  const body: Record<string, unknown> = {
    name: payload.roleName.trim(),
    email: (payload.email ?? "").trim(),
    phone_number: (payload.phone_number ?? "").trim(),
    status: sanitizeStatus(payload.status),
    is_active: updateStatusPayloadValue(payload.status),
    profile_url: profileUrlForApi(payload.profile_url),
  };
  if (!isFranchiseAdmin) {
    body.available_pages = availablePages;
    body.accessible_screens = availablePages;
  }

  const res = await apiRequest(ApiPaths.UPDATE_USER(userId), "PUT", body);
  if (!res.success) return false;
  return true;
};

/**
 * Create staff (Postman `type: 6`) via `POST /user/create`, then append to in-memory list.
 */
export const createStaffUserWithApi = async (
  payload: Omit<StaffSettingsModel, "id" | "createdDate">
): Promise<boolean> => {
  const createdById = (getLocalStorage(AppConstant.createdById) ?? "").trim();
  if (!createdById) {
    showErrorAlert("Missing session (created_by_id). Please log in again.");
    return false;
  }

  const staffPermKeys = (payload.screenPermissions ?? []).filter((k) => k !== "my-franchise");
  const result = await createWebManagementUser({
    name: payload.name.trim(),
    email: (payload.email ?? "").trim(),
    phone_number: (payload.phone_number ?? "").trim(),
    type: WEB_MANAGEMENT_USER_TYPE.STAFF,
    status: (payload.status ?? "active").toLowerCase(),
    is_from_web: true,
    created_by_id: createdById,
    available_pages: staffAvailablePagesFromMenuKeys(staffPermKeys),
    profile_url: profileUrlForApi(payload.profile_url),
  });

  if (!result.ok) return false;

  const raw = result.record as Record<string, unknown> | null | undefined;
  const serverId = pickRecordId(raw);
  const staffId = String(raw?.user_id ?? raw?.userId ?? payload.staffId ?? serverId ?? generateId());
  const isActive = raw?.is_active !== false;

  saveStaff(
    {
      ...payload,
      staffId,
      name: String(raw?.name ?? payload.name),
      email: (raw?.email as string | undefined) ?? payload.email,
      phone_number: (raw?.phone_number as string | undefined) ?? payload.phone_number,
      profile_url: (raw?.profile_url as string | undefined) ?? payload.profile_url,
      status: isActive ? "active" : "inactive",
    },
    undefined,
    serverId ? { newId: serverId } : undefined
  );
  return true;
};

/** Update staff via `PUT /user/update/:id`. */
export const updateStaffUserWithApi = async (
  id: string,
  payload: Omit<StaffSettingsModel, "id" | "createdDate">
): Promise<boolean> => {
  const userId = String(id || "").trim();
  if (!userId) return false;
  const staffPermKeys = (payload.screenPermissions ?? []).filter((k) => k !== "my-franchise");
  const pages = staffAvailablePagesFromMenuKeys(staffPermKeys);

  const body: Record<string, unknown> = {
    name: payload.name.trim(),
    email: (payload.email ?? "").trim(),
    phone_number: (payload.phone_number ?? "").trim(),
    status: sanitizeStatus(payload.status),
    is_active: updateStatusPayloadValue(payload.status),
    profile_url: profileUrlForApi(payload.profile_url),
    available_pages: pages,
    accessible_screens: pages,
  };

  const res = await apiRequest(ApiPaths.UPDATE_USER(userId), "PUT", body);
  if (!res.success) return false;
  return true;
};

export const getExpenseCategories = (): ExpenseCategoryModel[] => [
  ...mockExpenseCategories,
];
export const saveExpenseCategory = (
  payload: Omit<ExpenseCategoryModel, "id" | "createdDate">,
  id?: string
) => {
  if (id) {
    mockExpenseCategories = mockExpenseCategories.map((item) =>
      item.id === id ? { ...item, ...payload } : item
    );
    return;
  }
  mockExpenseCategories = [
    {
      ...payload,
      id: generateId(),
      createdDate: new Date().toISOString(),
    },
    ...mockExpenseCategories,
  ];
};

export const voidExpenseCategory = (id: string) => {
  mockExpenseCategories = mockExpenseCategories.filter((item) => item.id !== id);
};
