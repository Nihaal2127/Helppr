import { fetchArea } from "./areaService";
import { isFranchiseEmployeeExcludedScreenKey } from "../layout/franchiseEmployeeScreenPermissions";
import { showErrorAlert } from "../helper/alertHelper";
import { getLocalStorage } from "../helper/localStorageHelper";
import { AppConstant, UserRole } from "../constant/AppConstant";
import {
  createWebManagementUser,
  fetchUser,
  fetchUserById,
  menuKeysFromUserAccess,
  mapMenuKeysToAvailablePages,
  WEB_MANAGEMENT_USER_TYPE,
} from "./userService";
import type { AvailablePageEntry } from "./userService";

// Keep shapes local to this service so UI doesn't import mock datasets.
export type EmployeeRow = {
  _id: string;
  employee_id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  area_name: string;
  is_active: boolean;
  /** Chat can be toggled only when `is_active`; inactive employees force this off. */
  chat_enabled?: boolean;
  /** `page` + `url` rows kept in UI and sent as `available_pages` to API. */
  accessible_screens?: AvailablePageEntry[];
  /** Editable round-trip: selected `mainMenuItems` keys. */
  screenPermissionKeys?: string[];
};

export type AreaRow = {
  _id: string;
  area_name: string;
  city_name: string;
  state_name: string;
  /** Single pincode or comma-separated (API / legacy). */
  pincode?: string;
  /** Multiple pincodes when API returns an array. */
  pincodes?: string[] | string;
  pin_codes?: string[] | string;
  is_active: boolean;
};

export type ServiceRow = {
  _id: string;
  service_id: string;
  name: string;
  category_name: string;
  is_active: boolean;
};

export type CategoryRow = {
  _id: string;
  category_id: string;
  name: string;
  is_active: boolean;
};

export type RequestedServiceRow = {
  _id: string;
  name: string;
  category_id: string;
  category_name: string;
  description: string;
  image_url?: string;
  status: "pending";
};

export type RequestedCategoryRow = {
  _id: string;
  name: string;
  service_ids: string[];
  service_names: string[];
  description: string;
  image_url?: string;
  status: "pending";
};

type MyFranchiseBoxData = {
  employees: EmployeeRow[];
  areas: AreaRow[];
  services: ServiceRow[];
  categories: CategoryRow[];
  requested_services: RequestedServiceRow[];
  requested_categories: RequestedCategoryRow[];
};

/**
 * Map `/area/getAll` (or mock) record into the my-franchise table shape. API uses `name`;
 * the grid expects `area_name` (and optional city/state/pincodes).
 */
function mapApiAreaToFranchiseAreaRow(raw: any): AreaRow {
  if (!raw) {
    return {
      _id: "",
      area_name: "—",
      city_name: "—",
      state_name: "—",
      is_active: false,
    };
  }
  const pincodesRaw =
    raw.pincodes ?? raw.pincode ?? raw.pin_codes ?? (raw as any).pincode_list;
  const pinList = Array.isArray(pincodesRaw)
    ? pincodesRaw.map((p: unknown) => String(p).trim()).filter(Boolean)
    : typeof pincodesRaw === "string"
    ? pincodesRaw
        .split(/[,\n]/)
        .map((p: string) => p.trim())
        .filter(Boolean)
    : [];

  const isActive = (() => {
    if (typeof raw.is_active === "boolean") return raw.is_active;
    if (raw.is_active === 1) return true;
    if (raw.is_active === 0) return false;
    if (
      String(raw.is_active).toLowerCase() === "active" ||
      String(raw.status).toLowerCase() === "active"
    )
      return true;
    if (
      String(raw.is_active).toLowerCase() === "inactive" ||
      String(raw.status).toLowerCase() === "inactive"
    )
      return false;
    return true;
  })();

  return {
    _id: String(raw._id ?? raw.id ?? ""),
    area_name:
      String(raw.area_name ?? raw.name ?? raw.title ?? "").trim() || "—",
    city_name:
      String(
        raw.city_name ??
          (raw.city &&
            (typeof raw.city === "object" ? raw.city.name : raw.city)) ??
          ""
      ).trim() || "—",
    state_name:
      String(
        raw.state_name ??
          (raw.state &&
            (typeof raw.state === "object" ? raw.state.name : raw.state)) ??
          ""
      ).trim() || "—",
    pincodes: pinList,
    pincode:
      typeof raw.pincode === "string" && !pinList.length
        ? raw.pincode
        : undefined,
    is_active: isActive,
  };
}

let cachedSessionFranchiseId: string | null = null;
let sessionFranchiseIdInFlight: Promise<string | undefined> | null = null;

async function resolveSessionFranchiseId(): Promise<string | undefined> {
  if (cachedSessionFranchiseId) return cachedSessionFranchiseId;

  const fromStorage = (getLocalStorage(AppConstant.partnerId) || "").trim();
  if (fromStorage) {
    cachedSessionFranchiseId = fromStorage;
    return fromStorage;
  }

  if (sessionFranchiseIdInFlight) return sessionFranchiseIdInFlight;

  sessionFranchiseIdInFlight = (async () => {
    const currentUserId = (
      getLocalStorage(AppConstant.createdById) || ""
    ).trim();
    if (!currentUserId) return undefined;
    const userRes = await fetchUserById(currentUserId);
    const franchiseId = String(
      (userRes.user as any)?.franchise_id ?? ""
    ).trim();
    if (!franchiseId) return undefined;
    cachedSessionFranchiseId = franchiseId;
    return franchiseId;
  })();

  try {
    return await sessionFranchiseIdInFlight;
  } finally {
    sessionFranchiseIdInFlight = null;
  }
}

async function fetchAreaRowsForMyFranchise(): Promise<AreaRow[] | null> {
  const filters: { franchise_id?: string } = {};
  const fid = await resolveSessionFranchiseId();
  if (fid) filters.franchise_id = fid;

  const limit = 100;
  const maxPages = 30;
  const all: any[] = [];
  let page = 1;

  for (; page <= maxPages; page += 1) {
    const { response, areas, totalPages } = await fetchArea(
      page,
      limit,
      filters,
      []
    );
    if (!response) {
      return null;
    }
    if (!Array.isArray(areas)) {
      break;
    }
    all.push(...areas);
    const lastPage = !totalPages || page >= totalPages;
    if (lastPage) break;
  }

  if (all.length === 0) {
    return [];
  }
  return all.map(mapApiAreaToFranchiseAreaRow);
}

function mapApiEmployeeToFranchiseEmployeeRow(raw: any): EmployeeRow {
  const id = String(raw?._id ?? raw?.id ?? "").trim();
  const phone = String(raw?.phone_number ?? raw?.phone ?? "").trim();
  const role = String(raw?.role ?? raw?.designation ?? "-").trim() || "-";
  const employeeId = String(raw?.employee_id ?? raw?.user_id ?? "").trim();
  const areaName = String(raw?.area_name ?? raw?.area ?? "-").trim() || "-";
  const isActiveRaw = raw?.is_active;
  const isActive =
    typeof isActiveRaw === "boolean"
      ? isActiveRaw
      : String(isActiveRaw).toLowerCase() === "true" ||
        String(isActiveRaw) === "1";
  const screenPermissionKeys = menuKeysFromUserAccess(
    raw as Record<string, unknown>
  );
  const accessible_screens = mapMenuKeysToAvailablePages(screenPermissionKeys);

  return {
    _id: id,
    employee_id: employeeId || `FE-${id.slice(-6) || "000000"}`,
    name: String(raw?.name ?? "").trim() || "-",
    role,
    phone: phone || "-",
    email: String(raw?.email ?? "").trim() || "-",
    area_name: areaName,
    is_active: isActive,
    chat_enabled: isActive
      ? Boolean(raw?.chat ?? raw?.chat_enabled ?? true)
      : false,
    accessible_screens,
    screenPermissionKeys,
  };
}

async function fetchEmployeeRowsForMyFranchise(): Promise<
  EmployeeRow[] | null
> {
  const currentUserRole = String(
    getLocalStorage(AppConstant.userRole) ?? ""
  ).trim();
  const isFranchiseScopedByAuth =
    currentUserRole === UserRole.FRANCHISE_ADMIN ||
    currentUserRole === UserRole.EMPLOYEE;
  const franchiseId = isFranchiseScopedByAuth
    ? ""
    : (await resolveSessionFranchiseId()) ?? "";
  if (!isFranchiseScopedByAuth && !franchiseId) return [];

  const pageSize = 200;
  const maxPages = 50;
  const all: any[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    // type=3 => franchise employee
    // franchise_id ensures only current franchise employees are listed.
    // eslint-disable-next-line no-await-in-loop
    const res = await fetchUser(
      false,
      WEB_MANAGEMENT_USER_TYPE.FRANCHISE_EMPLOYEE,
      page,
      pageSize,
      franchiseId ? { franchise_id: franchiseId } : {},
      []
    );
    if (!res.response) return null;
    all.push(...(res.users ?? []));
    if (!res.totalPages || page >= res.totalPages) break;
  }

  return all.map(mapApiEmployeeToFranchiseEmployeeRow);
}

export async function fetchMyFranchiseBoxData(): Promise<MyFranchiseBoxData> {
  const apiEmployeeRows = await fetchEmployeeRowsForMyFranchise();
  // Areas: use live `/area/getAll` (see `areaService` + `ApiPaths`) so the grid shows server data; names come as `name` in API.
  const apiAreaRows = await fetchAreaRowsForMyFranchise();

  return {
    employees: apiEmployeeRows ?? [],
    areas: apiAreaRows ?? [],
    services: [],
    categories: [],
    requested_services: [],
    requested_categories: [],
  };
}

export async function setEmployeeChatEnabled(
  id: string,
  chat_enabled: boolean
): Promise<boolean> {
  void id;
  void chat_enabled;
  return false;
}

export async function setServiceActive(
  id: string,
  is_active: boolean
): Promise<boolean> {
  void id;
  void is_active;
  return false;
}

export async function setCategoryActive(
  id: string,
  is_active: boolean
): Promise<boolean> {
  void id;
  void is_active;
  return false;
}

type FranchiseEmployeeInput = {
  name: string;
  phone: string;
  email: string;
  is_active: boolean;
  chat_enabled: boolean;
  screenPermissionKeys: string[];
};

export async function createFranchiseEmployee(
  input: FranchiseEmployeeInput
): Promise<boolean> {
  const keys = (input.screenPermissionKeys ?? []).filter(
    (k) => !isFranchiseEmployeeExcludedScreenKey(k)
  );
  const accessible_screens = mapMenuKeysToAvailablePages(keys);

  const createdById = (getLocalStorage(AppConstant.createdById) ?? "").trim();
  const franchiseId = await resolveSessionFranchiseId();
  const useRealCreate = Boolean(createdById);

  if (!useRealCreate) {
    showErrorAlert("Missing session. Please log in again.");
    return false;
  }

  const res = await createWebManagementUser({
    name: input.name.trim(),
    email: input.email.trim(),
    phone_number: input.phone.trim(),
    type: WEB_MANAGEMENT_USER_TYPE.FRANCHISE_EMPLOYEE,
    status: input.is_active ? "active" : "inactive",
    is_from_web: true,
    created_by_id: createdById,
    ...(franchiseId ? { franchise_id: franchiseId } : {}),
    available_pages: accessible_screens,
    chat_enabled: input.is_active ? input.chat_enabled : false,
  });
  if (!res.ok) return false;
  return true;
}

export async function updateFranchiseEmployee(
  id: string,
  input: FranchiseEmployeeInput
): Promise<boolean> {
  void id;
  void input;
  return false;
}

export async function voidFranchiseEmployee(id: string): Promise<boolean> {
  void id;
  return false;
}

export type RequestedServiceInput = {
  name: string;
  category_id: string;
  description: string;
  image_url?: string;
};

export async function createRequestedService(
  input: RequestedServiceInput
): Promise<boolean> {
  void input;
  return false;
}

export async function updateRequestedService(
  id: string,
  input: RequestedServiceInput
): Promise<boolean> {
  void id;
  void input;
  return false;
}

export async function voidRequestedService(id: string): Promise<boolean> {
  void id;
  return false;
}

export type RequestedCategoryInput = {
  name: string;
  service_ids: string[];
  description: string;
  image_url?: string;
};

export async function createRequestedCategory(
  input: RequestedCategoryInput
): Promise<boolean> {
  void input;
  return false;
}

export async function updateRequestedCategory(
  id: string,
  input: RequestedCategoryInput
): Promise<boolean> {
  void id;
  void input;
  return false;
}

export async function voidRequestedCategory(id: string): Promise<boolean> {
  void id;
  return false;
}
