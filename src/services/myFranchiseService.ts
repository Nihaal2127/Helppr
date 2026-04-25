import {
  myFranchiseAreasSeed,
  myFranchiseCategoriesSeed,
  myFranchiseEmployeesSeed,
  myFranchiseServicesSeed,
} from "../mockData/myFranchiseMockData";
import { myFranchiseRequestedServicesSeed } from "../mockData/myFranchiseRequestedServicesSeed";
import { myFranchiseRequestedCategoriesSeed } from "../mockData/myFranchiseRequestedCategoriesSeed";
import { fetchArea } from "./areaService";
import { isFranchiseEmployeeExcludedScreenKey } from "../layout/franchiseEmployeeScreenPermissions";
import { showErrorAlert } from "../helper/alertHelper";
import { getLocalStorage } from "../helper/localStorageHelper";
import { AppConstant } from "../constant/AppConstant";
import {
  createWebManagementUser,
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

let mockEmployees: EmployeeRow[] = myFranchiseEmployeesSeed.map((item) => ({ ...item }));
let mockAreas: AreaRow[] = myFranchiseAreasSeed.map((item) => ({ ...item }));
let mockServices: ServiceRow[] = myFranchiseServicesSeed.map((item) => ({ ...item }));
let mockCategories: CategoryRow[] = myFranchiseCategoriesSeed.map((item) => ({ ...item }));
let mockRequestedServices: RequestedServiceRow[] = myFranchiseRequestedServicesSeed.map((item) => ({
  ...item,
}));
let mockRequestedCategories: RequestedCategoryRow[] = myFranchiseRequestedCategoriesSeed.map((item) => ({
  ...item,
}));

const USE_MOCK_MY_FRANCHISE_API = true;

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
  const pincodesRaw = raw.pincodes ?? raw.pincode ?? raw.pin_codes ?? (raw as any).pincode_list;
  const pinList = Array.isArray(pincodesRaw)
    ? pincodesRaw.map((p: unknown) => String(p).trim()).filter(Boolean)
    : typeof pincodesRaw === "string"
      ? pincodesRaw.split(/[,\n]/).map((p: string) => p.trim()).filter(Boolean)
      : [];

  const isActive = (() => {
    if (typeof raw.is_active === "boolean") return raw.is_active;
    if (raw.is_active === 1) return true;
    if (raw.is_active === 0) return false;
    if (String(raw.is_active).toLowerCase() === "active" || String(raw.status).toLowerCase() === "active")
      return true;
    if (String(raw.is_active).toLowerCase() === "inactive" || String(raw.status).toLowerCase() === "inactive")
      return false;
    return true;
  })();

  return {
    _id: String(raw._id ?? raw.id ?? ""),
    area_name: String(raw.area_name ?? raw.name ?? raw.title ?? "").trim() || "—",
    city_name: String(
      raw.city_name ?? (raw.city && (typeof raw.city === "object" ? raw.city.name : raw.city)) ?? ""
    ).trim() || "—",
    state_name: String(
      raw.state_name ?? (raw.state && (typeof raw.state === "object" ? raw.state.name : raw.state)) ?? ""
    ).trim() || "—",
    pincodes: pinList,
    pincode: typeof raw.pincode === "string" && !pinList.length ? raw.pincode : undefined,
    is_active: isActive,
  };
}

function franchiseIdForAreaQuery(): string | undefined {
  const p = (getLocalStorage(AppConstant.partnerId) || "").trim();
  if (p) return p;
  // Only the partner list uses `franchise_id` on the server; avoid sending `adminId` and hiding all rows.
  return undefined;
}

async function fetchAreaRowsForMyFranchise(): Promise<AreaRow[] | null> {
  const filters: { franchise_id?: string } = {};
  const fid = franchiseIdForAreaQuery();
  if (fid) filters.franchise_id = fid;

  const limit = 100;
  const maxPages = 30;
  const all: any[] = [];
  let page = 1;

  for (; page <= maxPages; page += 1) {
    const { response, areas, totalPages } = await fetchArea(page, limit, filters, []);
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

function categoryNameById(categoryId: string): string {
  const c = mockCategories.find((x) => x.category_id === categoryId);
  return c?.name ?? categoryId;
}

function serviceNamesFromIds(serviceIds: string[]): string[] {
  return serviceIds
    .map((id) => {
      const s = mockServices.find((m) => m._id === id || m.service_id === id);
      return s?.name;
    })
    .filter(Boolean) as string[];
}

export async function fetchMyFranchiseBoxData(): Promise<MyFranchiseBoxData> {
  // Areas: use live `/area/getAll` (see `areaService` + `ApiPaths`) so the grid shows server data; names come as `name` in API.
  const apiAreaRows = await fetchAreaRowsForMyFranchise();
  const areas: AreaRow[] =
    apiAreaRows === null
      ? [...mockAreas]
      : apiAreaRows.length > 0
        ? apiAreaRows
        : USE_MOCK_MY_FRANCHISE_API
          ? [...mockAreas]
          : [];

  return {
    employees: [...mockEmployees],
    areas,
    services: [...mockServices],
    categories: [...mockCategories],
    requested_services: [...mockRequestedServices],
    requested_categories: [...mockRequestedCategories],
  };
}

export async function setEmployeeChatEnabled(id: string, chat_enabled: boolean): Promise<boolean> {
  if (USE_MOCK_MY_FRANCHISE_API) {
    mockEmployees = mockEmployees.map((e) =>
      e._id === id && e.is_active ? { ...e, chat_enabled } : e
    );
    return true;
  }
  return false;
}

export async function setServiceActive(id: string, is_active: boolean): Promise<boolean> {
  if (USE_MOCK_MY_FRANCHISE_API) {
    mockServices = mockServices.map((s) =>
      s._id === id ? { ...s, is_active } : s
    );
    return true;
  }
  return false;
}

export async function setCategoryActive(id: string, is_active: boolean): Promise<boolean> {
  if (USE_MOCK_MY_FRANCHISE_API) {
    mockCategories = mockCategories.map((c) =>
      c._id === id ? { ...c, is_active } : c
    );
    return true;
  }
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

function nextEmployeeId(): string {
  let maxNum = 1000;
  for (const e of mockEmployees) {
    const m = /^FE-(\d+)$/i.exec(e.employee_id.trim());
    if (m) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n)) maxNum = Math.max(maxNum, n);
    }
  }
  return `FE-${maxNum + 1}`;
}

export async function createFranchiseEmployee(input: FranchiseEmployeeInput): Promise<boolean> {
  const keys = (input.screenPermissionKeys ?? []).filter((k) => !isFranchiseEmployeeExcludedScreenKey(k));
  const accessible_screens = mapMenuKeysToAvailablePages(keys);

  const createdById = (getLocalStorage(AppConstant.createdById) ?? "").trim();
  const useRealCreate = Boolean(createdById);

  /** Offline / no session: in-memory only. */
  if (USE_MOCK_MY_FRANCHISE_API && !useRealCreate) {
    const row: EmployeeRow = {
      _id: `e${Date.now()}`,
      employee_id: nextEmployeeId(),
      name: input.name.trim(),
      role: "-",
      phone: input.phone.trim(),
      email: input.email.trim(),
      area_name: "-",
      is_active: input.is_active,
      chat_enabled: input.is_active ? input.chat_enabled : false,
      accessible_screens,
      screenPermissionKeys: keys,
    };
    mockEmployees = [...mockEmployees, row];
    return true;
  }

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
    available_pages: accessible_screens,
    chat_enabled: input.is_active ? input.chat_enabled : false,
  });
  if (!res.ok) return false;

  const raw = res.record as Record<string, unknown> | null;
  const serverId = String(raw?._id ?? raw?.id ?? `e${Date.now()}`);
  const row: EmployeeRow = {
    _id: serverId,
    employee_id: nextEmployeeId(),
    name: input.name.trim(),
    role: "-",
    phone: input.phone.trim(),
    email: input.email.trim(),
    area_name: "-",
    is_active: input.is_active,
    chat_enabled: input.is_active ? input.chat_enabled : false,
    accessible_screens,
    screenPermissionKeys: keys,
  };
  mockEmployees = [...mockEmployees, row];
  return true;
}

export async function updateFranchiseEmployee(
  id: string,
  input: FranchiseEmployeeInput
): Promise<boolean> {
  const keys = (input.screenPermissionKeys ?? []).filter((k) => !isFranchiseEmployeeExcludedScreenKey(k));
  const accessible_screens = mapMenuKeysToAvailablePages(keys);

  if (USE_MOCK_MY_FRANCHISE_API) {
    mockEmployees = mockEmployees.map((e) =>
      e._id === id
        ? {
            ...e,
            name: input.name.trim(),
            phone: input.phone.trim(),
            email: input.email.trim(),
            is_active: input.is_active,
            chat_enabled: input.is_active ? input.chat_enabled : false,
            accessible_screens,
            screenPermissionKeys: keys,
          }
        : e
    );
    return true;
  }
  return false;
}

export async function voidFranchiseEmployee(id: string): Promise<boolean> {
  if (USE_MOCK_MY_FRANCHISE_API) {
    mockEmployees = mockEmployees.filter((e) => e._id !== id);
    return true;
  }
  return false;
}

export type RequestedServiceInput = {
  name: string;
  category_id: string;
  description: string;
  image_url?: string;
};

export async function createRequestedService(input: RequestedServiceInput): Promise<boolean> {
  if (USE_MOCK_MY_FRANCHISE_API) {
    const row: RequestedServiceRow = {
      _id: `rs${Date.now()}`,
      name: input.name.trim(),
      category_id: input.category_id,
      category_name: categoryNameById(input.category_id),
      description: input.description.trim(),
      image_url: input.image_url?.trim() || undefined,
      status: "pending",
    };
    mockRequestedServices = [...mockRequestedServices, row];
    return true;
  }
  return false;
}

export async function updateRequestedService(id: string, input: RequestedServiceInput): Promise<boolean> {
  if (USE_MOCK_MY_FRANCHISE_API) {
    mockRequestedServices = mockRequestedServices.map((r) =>
      r._id === id
        ? {
            ...r,
            name: input.name.trim(),
            category_id: input.category_id,
            category_name: categoryNameById(input.category_id),
            description: input.description.trim(),
            image_url: input.image_url?.trim() || undefined,
          }
        : r
    );
    return true;
  }
  return false;
}

export async function voidRequestedService(id: string): Promise<boolean> {
  if (USE_MOCK_MY_FRANCHISE_API) {
    mockRequestedServices = mockRequestedServices.filter((r) => r._id !== id);
    return true;
  }
  return false;
}

export type RequestedCategoryInput = {
  name: string;
  service_ids: string[];
  description: string;
  image_url?: string;
};

export async function createRequestedCategory(input: RequestedCategoryInput): Promise<boolean> {
  if (USE_MOCK_MY_FRANCHISE_API) {
    const ids = input.service_ids.map(String);
    const row: RequestedCategoryRow = {
      _id: `rc${Date.now()}`,
      name: input.name.trim(),
      service_ids: ids,
      service_names: serviceNamesFromIds(ids),
      description: input.description.trim(),
      image_url: input.image_url?.trim() || undefined,
      status: "pending",
    };
    mockRequestedCategories = [...mockRequestedCategories, row];
    return true;
  }
  return false;
}

export async function updateRequestedCategory(id: string, input: RequestedCategoryInput): Promise<boolean> {
  if (USE_MOCK_MY_FRANCHISE_API) {
    const ids = input.service_ids.map(String);
    mockRequestedCategories = mockRequestedCategories.map((r) =>
      r._id === id
        ? {
            ...r,
            name: input.name.trim(),
            service_ids: ids,
            service_names: serviceNamesFromIds(ids),
            description: input.description.trim(),
            image_url: input.image_url?.trim() || undefined,
          }
        : r
    );
    return true;
  }
  return false;
}

export async function voidRequestedCategory(id: string): Promise<boolean> {
  if (USE_MOCK_MY_FRANCHISE_API) {
    mockRequestedCategories = mockRequestedCategories.filter((r) => r._id !== id);
    return true;
  }
  return false;
}

