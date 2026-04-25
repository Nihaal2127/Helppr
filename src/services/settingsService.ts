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
import {
  createWebManagementUser,
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

  const staffPermKeys = payload.screenPermissions ?? [];
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
