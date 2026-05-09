import { ApiPaths } from "../remote/apiPaths";
import { showErrorAlert } from "../helper/alertHelper";
import { getLocalStorage } from "../helper/localStorageHelper";
import { AppConstant, UserRole } from "../constant/AppConstant";
import type { AvailablePageEntry } from "./userService";

const WEB_MANAGEMENT_USER_TYPE = {
  FRANCHISE_ADMIN: 1,
  FRANCHISE_EMPLOYEE: 3,
  SUPER_ADMIN: 5,
  STAFF: 6,
} as const;

const FRANCHISE_EMPLOYEE_EXCLUDED_SCREEN_KEYS = new Set<string>([
  "content-management",
  "location-management",
  "franchise-management",
  "service-management",
  "settings",
]);

async function callApiRequest(...args: any[]) {
  const { apiRequest } = await import("../remote/apiHelper");
  return (apiRequest as any)(...args);
}

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
  /** True when this service is mapped to current franchise. */
  is_my_franchise?: boolean;
};

export type CategoryRow = {
  _id: string;
  category_id: string;
  name: string;
  is_active: boolean;
  /** True when this category is mapped to current franchise. */
  is_my_franchise?: boolean;
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

function mapApiServiceRow(raw: any): ServiceRow {
  const id = String(raw?._id ?? raw?.id ?? "").trim();
  return {
    _id: id,
    service_id: String(raw?.service_id ?? id).trim() || id,
    name: String(raw?.name ?? "").trim() || "-",
    category_name: String(raw?.category_name ?? "").trim() || "-",
    is_active: normalizeBooleanLike(raw?.is_active),
    is_my_franchise: false,
  };
}

function mapApiCategoryRow(raw: any): CategoryRow {
  const id = String(raw?._id ?? raw?.id ?? "").trim();
  return {
    _id: id,
    category_id: String(raw?.category_id ?? id).trim() || id,
    name: String(raw?.name ?? "").trim() || "-",
    is_active: normalizeBooleanLike(raw?.is_active),
    is_my_franchise: false,
  };
}

type MyFranchiseBoxData = {
  employees: EmployeeRow[];
  areas: AreaRow[];
  services: ServiceRow[];
  categories: CategoryRow[];
  requested_services: RequestedServiceRow[];
  requested_categories: RequestedCategoryRow[];
};

function normalizeBooleanLike(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1") return true;
  if (value === 0 || value === "0") return false;
  return String(value ?? "").toLowerCase() === "true";
}

function mapApiRequestedServiceRow(raw: any): RequestedServiceRow {
  return {
    _id: String(raw?._id ?? ""),
    name: String(raw?.name ?? "").trim() || "-",
    category_id: String(raw?.category_id ?? "").trim(),
    category_name: String(raw?.category_name ?? "").trim() || "-",
    description: String(raw?.desc ?? raw?.description ?? "").trim(),
    image_url: raw?.image_url ? String(raw.image_url) : undefined,
    status: "pending",
  };
}

function mapApiRequestedCategoryRow(raw: any): RequestedCategoryRow {
  return {
    _id: String(raw?._id ?? ""),
    name: String(raw?.name ?? "").trim() || "-",
    service_ids: Array.isArray(raw?.service_ids)
      ? raw.service_ids.map((id: any) => String(id))
      : [],
    service_names: Array.isArray(raw?.service_names)
      ? raw.service_names.map((s: any) => String(s))
      : [],
    description: String(raw?.desc ?? raw?.description ?? "").trim(),
    image_url: raw?.image_url ? String(raw.image_url) : undefined,
    status: "pending",
  };
}

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
    const { fetchUserById } = await import("./userService");
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
  const { fetchArea } = await import("./areaService");
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

async function fetchCategoryRowsForMyFranchise(): Promise<CategoryRow[] | null> {
  const { fetchCategory } = await import("./categoryService");
  const { fetchFranchiseById } = await import("./franchiseService");
  const fid = await resolveSessionFranchiseId();
  if (!fid) return [];
  const franchise = await fetchFranchiseById(fid);
  if (!franchise) return [];
  const categoryIds = Array.from(
    new Set([
      ...((franchise.category_ids ?? []).map(String) || []),
      ...((franchise.categories ?? []).map(String) || []),
    ])
  )
    .map((id) => id.trim())
    .filter(Boolean);
  if (categoryIds.length === 0) return [];

  const pageSize = 200;
  const maxPages = 50;
  const all: any[] = [];
  for (let page = 1; page <= maxPages; page += 1) {
    // eslint-disable-next-line no-await-in-loop
    const res = await fetchCategory(page, pageSize, {}, []);
    if (!res.response) return null;
    all.push(...(res.categories ?? []));
    if (!res.totalPages || page >= res.totalPages) break;
  }

  return all
    .filter((raw: any) => categoryIds.includes(String(raw?._id ?? "").trim()))
    .map((raw: any) => {
      const id = String(raw?._id ?? raw?.id ?? "").trim();
      const isActiveRaw = raw?.is_active;
      const isActive =
        typeof isActiveRaw === "boolean"
          ? isActiveRaw
          : String(isActiveRaw).toLowerCase() === "true" ||
            String(isActiveRaw) === "1";
      return {
        _id: id,
        category_id: String(raw?.category_id ?? id).trim() || id,
        name: String(raw?.name ?? "").trim() || "-",
        is_active: isActive,
      } as CategoryRow;
    });
}

async function fetchServiceRowsForMyFranchise(): Promise<ServiceRow[] | null> {
  const { fetchService } = await import("./servicesService");
  const { fetchFranchiseById } = await import("./franchiseService");
  const fid = await resolveSessionFranchiseId();
  if (!fid) return [];
  const franchise = await fetchFranchiseById(fid);
  if (!franchise) return [];
  const serviceIds = Array.from(
    new Set([
      ...((franchise.service_ids ?? []).map(String) || []),
      ...((franchise.services ?? []).map(String) || []),
    ])
  )
    .map((id) => id.trim())
    .filter(Boolean);
  if (serviceIds.length === 0) return [];

  const pageSize = 200;
  const maxPages = 50;
  const all: any[] = [];
  for (let page = 1; page <= maxPages; page += 1) {
    // eslint-disable-next-line no-await-in-loop
    const res = await fetchService(page, pageSize, {}, []);
    if (!res.response) return null;
    all.push(...(res.services ?? []));
    if (!res.totalPages || page >= res.totalPages) break;
  }

  return all
    .filter((raw: any) => serviceIds.includes(String(raw?._id ?? "").trim()))
    .map((raw: any) => {
      const id = String(raw?._id ?? raw?.id ?? "").trim();
      const isActiveRaw = raw?.is_active;
      const isActive =
        typeof isActiveRaw === "boolean"
          ? isActiveRaw
          : String(isActiveRaw).toLowerCase() === "true" ||
            String(isActiveRaw) === "1";
      return {
        _id: id,
        service_id: String(raw?.service_id ?? id).trim() || id,
        name: String(raw?.name ?? "").trim() || "-",
        category_name: String(raw?.category_name ?? "").trim() || "-",
        is_active: isActive,
      } as ServiceRow;
    });
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
  const availablePagesRaw = Array.isArray(raw?.available_pages)
    ? raw.available_pages
    : [];
  const accessible_screens: AvailablePageEntry[] = availablePagesRaw
    .map((p: any) => ({
      page: String(p?.page ?? "").trim(),
      url: String(p?.url ?? "").trim(),
    }))
    .filter((p: AvailablePageEntry) => p.page && p.url);
  const screenPermissionKeys: string[] = [];

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
  const { fetchUser } = await import("./userService");

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

async function fetchAllCategoryRows(
  isRequest: boolean
): Promise<any[] | null> {
  const limit = 100;
  const maxPages = 30;
  const all: any[] = [];
  const franchiseId = isRequest ? await resolveSessionFranchiseId() : "";
  for (let page = 1; page <= maxPages; page += 1) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      is_request: String(isRequest),
      ...(franchiseId ? { franchise_id: franchiseId } : {}),
    });
    // eslint-disable-next-line no-await-in-loop
    const response = await callApiRequest(
      `${ApiPaths.GET_CATEGORY()}?${params.toString()}`,
      "GET",
      undefined,
      false,
      true,
      true,
      true
    );
    if (!response.success) return null;
    const records = response.data?.records;
    if (!Array.isArray(records)) break;
    all.push(...records);
    const totalPages = Number(response.data?.totalPages ?? 0);
    if (!totalPages || page >= totalPages) break;
  }
  return all;
}

async function fetchAllServiceRows(isRequest: boolean): Promise<any[] | null> {
  const limit = 100;
  const maxPages = 30;
  const all: any[] = [];
  const franchiseId = isRequest ? await resolveSessionFranchiseId() : "";
  for (let page = 1; page <= maxPages; page += 1) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      is_request: String(isRequest),
      ...(franchiseId ? { franchise_id: franchiseId } : {}),
    });
    // eslint-disable-next-line no-await-in-loop
    const response = await callApiRequest(
      `${ApiPaths.GET_SERVICE()}?${params.toString()}`,
      "GET",
      undefined,
      false,
      true,
      true,
      true
    );
    if (!response.success) return null;
    const records = response.data?.records;
    if (!Array.isArray(records)) break;
    all.push(...records);
    const totalPages = Number(response.data?.totalPages ?? 0);
    if (!totalPages || page >= totalPages) break;
  }
  return all;
}

export async function fetchMyFranchiseBoxData(): Promise<MyFranchiseBoxData> {
  const { fetchFranchiseById } = await import("./franchiseService");
  const franchiseId = await resolveSessionFranchiseId();
  let myCategoryIds = new Set<string>();
  let myServiceIds = new Set<string>();
  if (franchiseId) {
    const franchise = await fetchFranchiseById(franchiseId);
    if (franchise) {
      myCategoryIds = new Set(
        [
          ...((franchise.category_ids ?? []).map(String) || []),
          ...((franchise.categories ?? []).map(String) || []),
        ]
          .map((id) => id.trim())
          .filter(Boolean)
      );
      myServiceIds = new Set(
        [
          ...((franchise.service_ids ?? []).map(String) || []),
          ...((franchise.services ?? []).map(String) || []),
        ]
          .map((id) => id.trim())
          .filter(Boolean)
      );
    }
  }

  const [
    apiEmployeeRows,
    apiAreaRows,
    catalogCategoryRows,
    catalogServiceRows,
    requestedCategoryRows,
    requestedServiceRows,
  ] = await Promise.all([
    fetchEmployeeRowsForMyFranchise(),
    // Areas: use live `/area/getAll` (see `areaService` + `ApiPaths`) so the grid shows server data; names come as `name` in API.
    fetchAreaRowsForMyFranchise(),
    fetchAllCategoryRows(false),
    fetchAllServiceRows(false),
    fetchAllCategoryRows(true),
    fetchAllServiceRows(true),
  ]);

  return {
    employees: apiEmployeeRows ?? [],
    areas: apiAreaRows ?? [],
    services: (catalogServiceRows ?? []).map((raw) => {
      const row = mapApiServiceRow(raw);
      row.is_my_franchise = myServiceIds.has(row._id);
      return row;
    }),
    categories: (catalogCategoryRows ?? []).map((raw) => {
      const row = mapApiCategoryRow(raw);
      row.is_my_franchise = myCategoryIds.has(row._id);
      return row;
    }),
    requested_services: (requestedServiceRows ?? [])
      .filter((r) => r?.is_rejected == null)
      .map(mapApiRequestedServiceRow),
    requested_categories: (requestedCategoryRows ?? [])
      .filter((r) => r?.is_rejected == null)
      .map(mapApiRequestedCategoryRow),
  };
}

async function resolveMyFranchiseMappings(): Promise<{
  myCategoryIds: Set<string>;
  myServiceIds: Set<string>;
}> {
  const { fetchFranchiseById } = await import("./franchiseService");
  const franchiseId = await resolveSessionFranchiseId();
  let myCategoryIds = new Set<string>();
  let myServiceIds = new Set<string>();

  if (!franchiseId) {
    return { myCategoryIds, myServiceIds };
  }

  const franchise = await fetchFranchiseById(franchiseId);
  if (!franchise) {
    return { myCategoryIds, myServiceIds };
  }

  myCategoryIds = new Set(
    [
      ...((franchise.category_ids ?? []).map(String) || []),
      ...((franchise.categories ?? []).map(String) || []),
    ]
      .map((id) => id.trim())
      .filter(Boolean)
  );
  myServiceIds = new Set(
    [
      ...((franchise.service_ids ?? []).map(String) || []),
      ...((franchise.services ?? []).map(String) || []),
    ]
      .map((id) => id.trim())
      .filter(Boolean)
  );

  return { myCategoryIds, myServiceIds };
}

export async function fetchMyFranchiseEmployeesData(): Promise<EmployeeRow[]> {
  const rows = await fetchEmployeeRowsForMyFranchise();
  return (rows ?? []).map((e) => ({
    ...e,
    chat_enabled: e.is_active ? e.chat_enabled ?? true : false,
  }));
}

export async function fetchMyFranchiseAreasData(): Promise<AreaRow[]> {
  return (await fetchAreaRowsForMyFranchise()) ?? [];
}

export async function fetchMyFranchiseServicesData(): Promise<{
  services: ServiceRow[];
  requestedServices: RequestedServiceRow[];
}> {
  const { myServiceIds } = await resolveMyFranchiseMappings();
  const [catalogServiceRows, requestedServiceRows] = await Promise.all([
    fetchAllServiceRows(false),
    fetchAllServiceRows(true),
  ]);

  return {
    services: (catalogServiceRows ?? []).map((raw) => {
      const row = mapApiServiceRow(raw);
      row.is_my_franchise = myServiceIds.has(row._id);
      return row;
    }),
    requestedServices: (requestedServiceRows ?? [])
      .filter((r) => r?.is_rejected == null)
      .map(mapApiRequestedServiceRow),
  };
}

export async function fetchMyFranchiseCategoriesData(): Promise<{
  categories: CategoryRow[];
  requestedCategories: RequestedCategoryRow[];
  services: ServiceRow[];
}> {
  const [{ myCategoryIds, myServiceIds }, catalogCategoryRows, requestedCategoryRows, catalogServiceRows] =
    await Promise.all([
      resolveMyFranchiseMappings(),
      fetchAllCategoryRows(false),
      fetchAllCategoryRows(true),
      fetchAllServiceRows(false),
    ]);

  return {
    categories: (catalogCategoryRows ?? []).map((raw) => {
      const row = mapApiCategoryRow(raw);
      row.is_my_franchise = myCategoryIds.has(row._id);
      return row;
    }),
    requestedCategories: (requestedCategoryRows ?? [])
      .filter((r) => r?.is_rejected == null)
      .map(mapApiRequestedCategoryRow),
    services: (catalogServiceRows ?? []).map((raw) => {
      const row = mapApiServiceRow(raw);
      row.is_my_franchise = myServiceIds.has(row._id);
      return row;
    }),
  };
}

/** Lightweight refresh used after creating/updating a service request in My Franchise. */
export async function fetchMyFranchiseRequestedServices(): Promise<
  RequestedServiceRow[]
> {
  const rows = await fetchAllServiceRows(true);
  return (rows ?? [])
    .filter((r) => r?.is_rejected == null)
    .map(mapApiRequestedServiceRow);
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
  const response = await callApiRequest(
    ApiPaths.UPDATE_SERVICE(id),
    "PUT",
    { is_active },
    false,
    false,
    false,
    true
  );
  return Boolean(response.success);
}

export async function setCategoryActive(
  id: string,
  is_active: boolean
): Promise<boolean> {
  const response = await callApiRequest(
    ApiPaths.UPDATE_CATEGORY(id),
    "PUT",
    { is_active },
    false,
    false,
    false,
    true
  );
  return Boolean(response.success);
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
    (k) => !FRANCHISE_EMPLOYEE_EXCLUDED_SCREEN_KEYS.has(k)
  );
  const { createWebManagementUser, mapMenuKeysToAvailablePages } = await import(
    "./userService"
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
  const franchiseId = await resolveSessionFranchiseId();
  const payload = {
    name: input.name.trim(),
    category_id: input.category_id,
    desc: input.description.trim(),
    ...(input.image_url ? { image_url: input.image_url } : {}),
    ...(franchiseId ? { franchise_id: franchiseId } : {}),
    is_request: true,
  };
  const response = await callApiRequest(
    ApiPaths.CREATE_SERVICE_REQUEST,
    "POST",
    payload,
    false,
    false,
    false,
    true
  );
  return Boolean(response.success);
}

export async function updateRequestedService(
  id: string,
  input: RequestedServiceInput
): Promise<boolean> {
  const payload = {
    name: input.name.trim(),
    category_id: input.category_id,
    desc: input.description.trim(),
    ...(input.image_url ? { image_url: input.image_url } : {}),
    is_request: true,
  };
  const response = await callApiRequest(
    ApiPaths.UPDATE_SERVICE_REQUEST(id),
    "PUT",
    payload,
    false,
    false,
    false,
    true
  );
  return Boolean(response.success);
}

export async function voidRequestedService(id: string): Promise<boolean> {
  const response = await callApiRequest(
    ApiPaths.DELETE_SERVICE(id),
    "DELETE",
    undefined,
    false,
    false,
    false,
    true
  );
  return Boolean(response.success);
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
  const franchiseId = await resolveSessionFranchiseId();
  const payload = {
    name: input.name.trim(),
    service_ids: input.service_ids,
    desc: input.description.trim(),
    ...(input.image_url ? { image_url: input.image_url } : {}),
    ...(franchiseId ? { franchise_id: franchiseId } : {}),
    is_request: true,
  };
  const response = await callApiRequest(
    ApiPaths.CREATE_CATEGORY_REQUEST,
    "POST",
    payload,
    false,
    false,
    false,
    true
  );
  return Boolean(response.success);
}

export async function updateRequestedCategory(
  id: string,
  input: RequestedCategoryInput
): Promise<boolean> {
  const payload = {
    name: input.name.trim(),
    service_ids: input.service_ids,
    desc: input.description.trim(),
    ...(input.image_url ? { image_url: input.image_url } : {}),
    is_request: true,
  };
  const response = await callApiRequest(
    ApiPaths.UPDATE_CATEGORY_REQUEST(id),
    "PUT",
    payload,
    false,
    false,
    false,
    true
  );
  return Boolean(response.success);
}

export async function voidRequestedCategory(id: string): Promise<boolean> {
  const response = await callApiRequest(
    ApiPaths.DELETE_CATEGORY(id),
    "DELETE",
    undefined,
    false,
    false,
    false,
    true
  );
  return Boolean(response.success);
}
