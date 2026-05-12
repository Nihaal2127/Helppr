import { fetchArea } from "./areaService";
import { fetchCategoryById } from "./categoryService";
import { fetchServiceById } from "./servicesService";
import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";
import { isFranchiseEmployeeExcludedScreenKey } from "../layout/franchiseEmployeeScreenPermissions";
import { showErrorAlert } from "../helper/alertHelper";
import { getLocalStorage } from "../helper/localStorageHelper";
import { AppConstant, UserRole } from "../constant/AppConstant";
import { apiDocumentId } from "../helper/utility";
import {
  createWebManagementUser,
  fetchUser,
  fetchUserById,
  menuKeysFromAvailablePages,
  menuKeysFromUserAccess,
  mapMenuKeysToAvailablePages,
  normalizePhoneForUserCreate,
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
  /** From `GET /category/get/:id` when API sends `service_names` (optional). */
  service_names?: string[];
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

function normalizeBooleanLike(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1") return true;
  if (value === 0 || value === "0") return false;
  return String(value ?? "").toLowerCase() === "true";
}

function mapApiServiceRow(raw: any): ServiceRow {
  return {
    _id: String(raw?._id ?? ""),
    service_id: String(raw?.service_id ?? raw?._id ?? ""),
    name: String(raw?.name ?? "").trim() || "-",
    category_name: String(raw?.category_name ?? "").trim() || "-",
    is_active: normalizeBooleanLike(raw?.is_active),
  };
}

function mapApiCategoryRow(raw: any): CategoryRow {
  return {
    _id: String(raw?._id ?? ""),
    category_id: String(raw?.category_id ?? raw?._id ?? ""),
    name: String(raw?.name ?? "").trim() || "-",
    is_active: normalizeBooleanLike(raw?.is_active),
  };
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

const CATALOG_HYDRATE_CONCURRENCY = 8;

type ServiceCatalogHint = { name?: string; category_name?: string };

/** `GET …/franchise-service|category/getAll` — My Franchise catalogue (see API-Service-Category-Franchise-Requests.txt). */
type FranchiseServiceMapCache = {
  mapId: string;
  franchise_id: string;
  services_list: { service_id: string; is_active: boolean }[];
  /** Labels from embedded `service_id` on mapping GET (merged after PUT when API returns embeds). */
  serviceCatalogHints?: Record<string, ServiceCatalogHint>;
  active_services?: boolean;
  inactive_services?: boolean;
  order_number?: number;
};

type FranchiseCategoryMapCache = {
  mapId: string;
  franchise_id: string;
  categories_list: { category_id: string; is_active: boolean }[];
  active_categories?: boolean;
  inactive_categories?: boolean;
  order_number?: number;
};

let franchiseMapCacheScopeFid: string | null = null;
let cachedFranchiseServiceMap: FranchiseServiceMapCache | null = null;
let cachedFranchiseCategoryMap: FranchiseCategoryMapCache | null = null;

function syncFranchiseMapCacheScope(franchiseId: string) {
  if (franchiseMapCacheScopeFid !== franchiseId) {
    franchiseMapCacheScopeFid = franchiseId;
    cachedFranchiseServiceMap = null;
    cachedFranchiseCategoryMap = null;
  }
}

function listPayloadRecords(data: unknown): any[] {
  if (!data || typeof data !== "object") return [];
  const d = data as Record<string, unknown>;
  const inner =
    d.data && typeof d.data === "object" && !Array.isArray(d.data)
      ? (d.data as Record<string, unknown>)
      : d;
  const rec = inner.records ?? d.records;
  return Array.isArray(rec) ? rec : [];
}

function listPayloadTotalPages(data: unknown): number {
  if (!data || typeof data !== "object") return 0;
  const d = data as Record<string, unknown>;
  const inner =
    d.data && typeof d.data === "object" && !Array.isArray(d.data)
      ? (d.data as Record<string, unknown>)
      : d;
  const tp = Number(inner.totalPages ?? d.totalPages ?? 0);
  if (Number.isFinite(tp) && tp > 0) return tp;
  const totalItems = Number(inner.totalItems ?? d.totalItems ?? 0);
  if (Number.isFinite(totalItems) && totalItems > 0) {
    const limitRaw = Number(inner.limit ?? d.limit ?? 0);
    const lim =
      Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 50;
    return Math.max(1, Math.ceil(totalItems / lim));
  }
  return 0;
}

/** Top-level array on paginated JSON (e.g. `all_categories` next to `records`). */
function listPayloadRootArray(data: unknown, key: string): any[] {
  if (!data || typeof data !== "object") return [];
  const d = data as Record<string, unknown>;
  const inner =
    d.data && typeof d.data === "object" && !Array.isArray(d.data)
      ? (d.data as Record<string, unknown>)
      : d;
  const arr = inner[key];
  return Array.isArray(arr) ? arr : [];
}

/** When `GET …/franchise-service/getAll` embeds populated `service_id` docs, reuse labels and avoid redundant catalogue GETs. */
function buildServiceCatalogHintsFromRawList(
  rawList: unknown
): Record<string, ServiceCatalogHint> {
  const hints: Record<string, ServiceCatalogHint> = {};
  if (!Array.isArray(rawList)) return hints;
  for (const item of rawList) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const ref = row.service_id;
    if (!ref || typeof ref !== "object") continue;
    const doc = ref as Record<string, unknown>;
    const id =
      apiDocumentId(doc._id) || apiDocumentId(doc) || String(doc._id ?? "").trim();
    if (!id) continue;
    const key = id.trim().toLowerCase();
    const name = String(doc.name ?? "").trim() || undefined;
    let category_name: string | undefined;
    const flatCn = doc.category_name;
    if (typeof flatCn === "string" && flatCn.trim()) {
      category_name = flatCn.trim();
    } else {
      const cat = doc.category_id;
      if (cat && typeof cat === "object") {
        const nm = String((cat as { name?: unknown }).name ?? "").trim();
        if (nm) category_name = nm;
      }
    }
    hints[key] = { ...(hints[key] ?? {}), name, category_name };
  }
  return hints;
}

/** Franchise admin / employee JWTs are franchise-scoped; omit `franchise_id` on catalogue mapping GETs. Super admin / staff pass `franchise_id` when filtering. */
function isFranchiseCatalogTokenScoped(): boolean {
  const currentUserRole = String(
    getLocalStorage(AppConstant.userRole) ?? ""
  ).trim();
  return (
    currentUserRole === UserRole.FRANCHISE_ADMIN ||
    currentUserRole === UserRole.EMPLOYEE
  );
}

function orderedCategoryRows(
  rows: { category_id: string; is_active: boolean }[],
  orderIds: unknown
) {
  if (!Array.isArray(orderIds) || !orderIds.length) return rows;
  const pos = new Map(
    orderIds.map((x, i) => [String(x).trim().toLowerCase(), i])
  );
  return [...rows].sort(
    (a, b) =>
      (pos.get(a.category_id.toLowerCase()) ?? 1e9) -
      (pos.get(b.category_id.toLowerCase()) ?? 1e9)
  );
}

/**
 * When `GET …/franchise-category/getAll` returns `all_categories`, use it as the
 * full catalogue for My Franchise while keeping mapping `is_active` when the row
 * exists in `categories_list`, otherwise `franchise_active`. Same `CategoryRow`
 * shape and table columns; expands `categories_list` so toggles resolve every row.
 */
function mergeFranchiseCategoryListFromAllCategories(
  normalizedFromMap: { category_id: string; is_active: boolean }[],
  allCats: unknown[] | undefined,
  orderIds: unknown
): { category_id: string; is_active: boolean }[] {
  if (!Array.isArray(allCats) || !allCats.length) {
    return orderedCategoryRows(normalizedFromMap, orderIds);
  }
  const fromMap = new Map(
    normalizedFromMap.map((c) => [c.category_id.trim().toLowerCase(), c.is_active])
  );
  const seen = new Set<string>();
  const merged: { category_id: string; is_active: boolean }[] = [];

  for (const item of allCats) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const cid =
      apiDocumentId(o._id) || apiDocumentId(o) || String(o._id ?? "").trim();
    if (!cid) continue;
    const key = cid.trim().toLowerCase();
    seen.add(key);
    const fa = o.franchise_active;
    const franchiseActive =
      typeof fa === "boolean" ? fa : normalizeBooleanLike(fa ?? false);
    const is_active = fromMap.has(key) ? fromMap.get(key)! : franchiseActive;
    merged.push({ category_id: cid, is_active });
  }

  for (const row of normalizedFromMap) {
    const key = row.category_id.trim().toLowerCase();
    if (!seen.has(key)) {
      merged.push(row);
      seen.add(key);
    }
  }

  return orderedCategoryRows(merged, orderIds);
}

function orderedServiceRows(
  rows: { service_id: string; is_active: boolean }[],
  orderIds: unknown
) {
  if (!Array.isArray(orderIds) || !orderIds.length) return rows;
  const pos = new Map(
    orderIds.map((x, i) => [String(x).trim().toLowerCase(), i])
  );
  return [...rows].sort(
    (a, b) =>
      (pos.get(a.service_id.toLowerCase()) ?? 1e9) -
      (pos.get(b.service_id.toLowerCase()) ?? 1e9)
  );
}

/** Match catalogue `_id` to map `service_id` / `category_id` (case-insensitive 24-hex). */
function idsLooselyEqual(a: string, b: string): boolean {
  const x = String(a ?? "").trim();
  const y = String(b ?? "").trim();
  if (!x || !y) return false;
  if (x === y) return true;
  return x.toLowerCase() === y.toLowerCase();
}

function findFranchiseServiceListIndex(
  list: { service_id: string; is_active: boolean }[],
  catalogueMongoOrServiceId: string
): number {
  const id = String(catalogueMongoOrServiceId ?? "").trim();
  return list.findIndex((s) => idsLooselyEqual(s.service_id, id));
}

function findFranchiseCategoryListIndex(
  list: { category_id: string; is_active: boolean }[],
  catalogueMongoOrCategoryId: string
): number {
  const id = String(catalogueMongoOrCategoryId ?? "").trim();
  return list.findIndex((c) => idsLooselyEqual(c.category_id, id));
}

function pickFranchiseScopedRecord(records: any[], franchiseId: string): any | null {
  if (!Array.isArray(records) || !records.length) return null;
  const fid = String(franchiseId ?? "").trim();
  if (!fid) return records[0];
  return (
    records.find((raw) => apiDocumentId(raw?.franchise_id) === fid) ??
    records[0]
  );
}

const franchiseServiceMapInflight = new Map<
  string,
  Promise<FranchiseServiceMapCache | null>
>();
const franchiseCategoryMapInflight = new Map<
  string,
  Promise<FranchiseCategoryMapCache | null>
>();

async function fetchFranchiseServiceMapForFranchiseDeduped(
  franchiseId: string
): Promise<FranchiseServiceMapCache | null> {
  const fid = String(franchiseId ?? "").trim();
  const dedupeKey =
    fid || (isFranchiseCatalogTokenScoped() ? "__scoped__" : "");
  if (!dedupeKey) return null;
  const existing = franchiseServiceMapInflight.get(dedupeKey);
  if (existing) return existing;
  const p = fetchFranchiseServiceMapForFranchise(fid).finally(() => {
    franchiseServiceMapInflight.delete(dedupeKey);
  });
  franchiseServiceMapInflight.set(dedupeKey, p);
  return p;
}

async function fetchFranchiseCategoryMapForFranchiseDeduped(
  franchiseId: string
): Promise<FranchiseCategoryMapCache | null> {
  const fid = String(franchiseId ?? "").trim();
  const dedupeKey =
    fid || (isFranchiseCatalogTokenScoped() ? "__scoped__" : "");
  if (!dedupeKey) return null;
  const existing = franchiseCategoryMapInflight.get(dedupeKey);
  if (existing) return existing;
  const p = fetchFranchiseCategoryMapForFranchise(fid).finally(() => {
    franchiseCategoryMapInflight.delete(dedupeKey);
  });
  franchiseCategoryMapInflight.set(dedupeKey, p);
  return p;
}

/** Pending franchise catalogue requests (exclude rejected / approved rows). */
function includeInFranchisePendingRequests(record: any): boolean {
  if (!record || typeof record !== "object") return false;
  if (record.is_request === false) return false;
  if (record.is_rejected === true) return false;
  const ap = String(record.approval_status ?? record.status ?? "")
    .trim()
    .toLowerCase();
  if (ap === "rejected" || ap === "reject") return false;
  if (ap === "approve" || ap === "approved") return false;
  return true;
}

function normalizeFranchiseServiceList(
  raw: unknown
): { service_id: string; is_active: boolean }[] {
  if (!Array.isArray(raw)) return [];
  const out: { service_id: string; is_active: boolean }[] = [];
  for (const item of raw) {
    if (item == null) continue;
    if (typeof item === "string" || typeof item === "number") {
      const sid = String(item).trim();
      if (sid) out.push({ service_id: sid, is_active: true });
      continue;
    }
    if (typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const sid =
      apiDocumentId(o.service_id) ||
      apiDocumentId(o._id) ||
      String(o.id ?? "").trim();
    if (!sid) continue;
    /** Row `is_active` = franchise on/off; nested `service_id.is_active` is catalogue (ignored here). */
    const rowActive =
      o.is_active !== undefined && o.is_active !== null
        ? normalizeBooleanLike(o.is_active)
        : true;
    out.push({ service_id: sid, is_active: rowActive });
  }
  return out;
}

function normalizeFranchiseCategoryList(
  raw: unknown
): { category_id: string; is_active: boolean }[] {
  if (!Array.isArray(raw)) return [];
  const out: { category_id: string; is_active: boolean }[] = [];
  for (const item of raw) {
    if (item == null) continue;
    if (typeof item === "string" || typeof item === "number") {
      const cid = String(item).trim();
      if (cid) out.push({ category_id: cid, is_active: true });
      continue;
    }
    if (typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const cid =
      apiDocumentId(o.category_id) ||
      apiDocumentId(o._id) ||
      String(o.id ?? "").trim();
    if (!cid) continue;
    const rowActive =
      o.is_active !== undefined && o.is_active !== null
        ? normalizeBooleanLike(o.is_active)
        : true;
    out.push({
      category_id: cid,
      is_active: rowActive,
    });
  }
  return out;
}

async function fetchFranchiseServiceMapForFranchise(
  franchiseId: string
): Promise<FranchiseServiceMapCache | null> {
  const fid = String(franchiseId ?? "").trim();
  const scoped = isFranchiseCatalogTokenScoped();
  if (!scoped && !fid) return null;
  const limit = 50;
  const maxPages = 30;
  for (let page = 1; page <= maxPages; page += 1) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (!scoped && fid) params.set("franchise_id", fid);
    // eslint-disable-next-line no-await-in-loop
    const response = await apiRequest(
      `${ApiPaths.GET_FRANCHISE_SERVICE_ALL()}?${params.toString()}`,
      "GET",
      undefined,
      false,
      true,
      true,
      true
    );
    if (!response.success) return null;
    const records = listPayloadRecords(response.data);
    const raw = pickFranchiseScopedRecord(records, fid);
    if (raw) {
      const rowFid = apiDocumentId(raw?.franchise_id) || fid;
      let services_list = normalizeFranchiseServiceList(raw?.services_list);
      services_list = orderedServiceRows(services_list, raw?.services_order);
      if (services_list.length) {
        const mapId = String(raw?._id ?? "").trim();
        if (mapId) {
          return {
            mapId,
            franchise_id: rowFid,
            services_list,
            serviceCatalogHints: buildServiceCatalogHintsFromRawList(
              raw?.services_list
            ),
            active_services:
              typeof raw?.active_services === "boolean"
                ? raw.active_services
                : undefined,
            inactive_services:
              typeof raw?.inactive_services === "boolean"
                ? raw.inactive_services
                : undefined,
            order_number:
              typeof raw?.order_number === "number"
                ? raw.order_number
                : undefined,
          };
        }
      }
    }
    const totalPages = listPayloadTotalPages(response.data);
    if (!totalPages || page >= totalPages) break;
  }
  return null;
}

async function fetchFranchiseCategoryMapForFranchise(
  franchiseId: string
): Promise<FranchiseCategoryMapCache | null> {
  const fid = String(franchiseId ?? "").trim();
  const scoped = isFranchiseCatalogTokenScoped();
  if (!scoped && !fid) return null;
  const limit = 50;
  const maxPages = 30;
  for (let page = 1; page <= maxPages; page += 1) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (!scoped && fid) params.set("franchise_id", fid);
    // eslint-disable-next-line no-await-in-loop
    const response = await apiRequest(
      `${ApiPaths.GET_FRANCHISE_CATEGORY_ALL()}?${params.toString()}`,
      "GET",
      undefined,
      false,
      true,
      true,
      true
    );
    if (!response.success) return null;
    const records = listPayloadRecords(response.data);
    const raw = pickFranchiseScopedRecord(records, fid);
    if (raw) {
      const rowFid = apiDocumentId(raw?.franchise_id) || fid;
      const normalized = normalizeFranchiseCategoryList(raw?.categories_list);
      const allCats = listPayloadRootArray(response.data, "all_categories");
      const categories_list = mergeFranchiseCategoryListFromAllCategories(
        normalized,
        allCats,
        raw?.categories_order
      );
      if (categories_list.length) {
        const mapId = String(raw?._id ?? "").trim();
        if (mapId) {
          return {
            mapId,
            franchise_id: rowFid,
            categories_list,
            active_categories:
              typeof raw?.active_categories === "boolean"
                ? raw.active_categories
                : undefined,
            inactive_categories:
              typeof raw?.inactive_categories === "boolean"
                ? raw.inactive_categories
                : undefined,
            order_number:
              typeof raw?.order_number === "number"
                ? raw.order_number
                : undefined,
          };
        }
      }
    }
    const totalPages = listPayloadTotalPages(response.data);
    if (!totalPages || page >= totalPages) break;
  }
  return null;
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

async function fetchCategoryRowsForMyFranchise(): Promise<CategoryRow[] | null> {
  const fid = (await resolveSessionFranchiseId()) ?? "";
  if (!isFranchiseCatalogTokenScoped() && !fid) return [];
  syncFranchiseMapCacheScope(fid);

  const catMap = await fetchFranchiseCategoryMapForFranchiseDeduped(fid);
  if (!catMap?.categories_list?.length) {
    cachedFranchiseCategoryMap = null;
    return [];
  }
  cachedFranchiseCategoryMap = catMap;

  const list = catMap.categories_list;
  const rows: CategoryRow[] = [];
  for (let i = 0; i < list.length; i += CATALOG_HYDRATE_CONCURRENCY) {
    const chunk = list.slice(i, i + CATALOG_HYDRATE_CONCURRENCY);
    // eslint-disable-next-line no-await-in-loop
    const chunkRows = await Promise.all(
      chunk.map(async (entry) => {
        const { response, category } = await fetchCategoryById(entry.category_id);
        if (!response || !category) return null;
        const id = String(category._id ?? entry.category_id).trim();
        const sn = (category as { service_names?: unknown }).service_names;
        const service_names = Array.isArray(sn)
          ? sn.map((x) => String(x).trim()).filter(Boolean)
          : [];
        return {
          _id: id,
          category_id: String(category.category_id ?? id).trim() || id,
          name: String(category.name ?? "").trim() || "-",
          is_active: entry.is_active,
          ...(service_names.length ? { service_names } : {}),
        } as CategoryRow;
      })
    );
    for (const r of chunkRows) {
      if (r) rows.push(r);
    }
  }
  return rows;
}

async function fetchServiceRowsForMyFranchise(): Promise<ServiceRow[] | null> {
  const fid = (await resolveSessionFranchiseId()) ?? "";
  if (!isFranchiseCatalogTokenScoped() && !fid) return [];
  syncFranchiseMapCacheScope(fid);

  const svcMap = await fetchFranchiseServiceMapForFranchiseDeduped(fid);
  if (!svcMap?.services_list?.length) {
    cachedFranchiseServiceMap = null;
    return [];
  }
  cachedFranchiseServiceMap = svcMap;

  const list = svcMap.services_list;
  const rows: ServiceRow[] = [];
  for (let i = 0; i < list.length; i += CATALOG_HYDRATE_CONCURRENCY) {
    const chunk = list.slice(i, i + CATALOG_HYDRATE_CONCURRENCY);
    // eslint-disable-next-line no-await-in-loop
    const chunkRows = await Promise.all(
      chunk.map(async (entry) => {
        const sid = String(entry.service_id ?? "").trim();
        const hintKey = sid.toLowerCase();
        const hint = svcMap.serviceCatalogHints?.[hintKey];
        let name = hint?.name?.trim() ?? "";
        let category_name = hint?.category_name?.trim() ?? "";

        if (!name || !category_name) {
          const { response, service } = await fetchServiceById(entry.service_id);
          if (!response || !service) return null;
          const id = String(service._id ?? entry.service_id).trim();
          if (!name) {
            name = String(service.name ?? "").trim() || "-";
          }
          if (!category_name) {
            category_name =
              String(service.category_name ?? "").trim() || "";
          }
          if (!category_name || category_name === "-") {
            const cid = apiDocumentId(
              (service as { category_id?: unknown }).category_id
            );
            if (cid) {
              const { response: cr, category } = await fetchCategoryById(cid);
              if (cr && category) {
                category_name =
                  String(category.name ?? "").trim() || category_name || "-";
              }
            }
          }
          if (!category_name) category_name = "-";
          return {
            _id: id,
            service_id: String(service.service_id ?? id).trim() || id,
            name,
            category_name,
            is_active: entry.is_active,
          } as ServiceRow;
        }

        return {
          _id: sid,
          service_id: sid,
          name: name || "-",
          category_name: category_name || "-",
          is_active: entry.is_active,
        } as ServiceRow;
      })
    );
    for (const r of chunkRows) {
      if (r) rows.push(r);
    }
  }
  return rows;
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

async function fetchAllCategoryRows(
  isRequest: boolean
): Promise<any[] | null> {
  const limit = 100;
  const maxPages = 30;
  const all: any[] = [];
  for (let page = 1; page <= maxPages; page += 1) {
    // eslint-disable-next-line no-await-in-loop
    const response = await apiRequest(
      `${ApiPaths.GET_CATEGORY()}?page=${page}&limit=${limit}&is_request=${String(
        isRequest
      )}`,
      "GET",
      undefined,
      false,
      true,
      true,
      true
    );
    if (!response.success) return null;
    const records = listPayloadRecords(response.data);
    if (!records.length) break;
    all.push(...records);
    const totalPages = listPayloadTotalPages(response.data);
    if (!totalPages || page >= totalPages) break;
  }
  return all;
}

async function fetchAllServiceRows(isRequest: boolean): Promise<any[] | null> {
  const limit = 100;
  const maxPages = 30;
  const all: any[] = [];
  for (let page = 1; page <= maxPages; page += 1) {
    // eslint-disable-next-line no-await-in-loop
    const response = await apiRequest(
      `${ApiPaths.GET_SERVICE()}?page=${page}&limit=${limit}&is_request=${String(
        isRequest
      )}`,
      "GET",
      undefined,
      false,
      true,
      true,
      true
    );
    if (!response.success) return null;
    const records = listPayloadRecords(response.data);
    if (!records.length) break;
    all.push(...records);
    const totalPages = listPayloadTotalPages(response.data);
    if (!totalPages || page >= totalPages) break;
  }
  return all;
}

/** Subset of `MyFranchiseBoxData` the UI can lazy-load per tab / view mode. */
export type MyFranchiseDataSlice =
  | "employees"
  | "areas"
  | "services"
  | "categories"
  | "requested_services"
  | "requested_categories";

const ALL_MY_FRANCHISE_SLICES: MyFranchiseDataSlice[] = [
  "employees",
  "areas",
  "services",
  "categories",
  "requested_services",
  "requested_categories",
];

/** Loads only the requested slices (parallel per slice). Use on My Franchise to avoid firing every `getAll` on initial paint. */
export async function fetchMyFranchiseDataSlices(
  slices: readonly MyFranchiseDataSlice[]
): Promise<Partial<MyFranchiseBoxData>> {
  const need = new Set(slices);
  const out: Partial<MyFranchiseBoxData> = {};
  const tasks: Promise<void>[] = [];

  if (need.has("employees")) {
    tasks.push(
      (async () => {
        const r = await fetchEmployeeRowsForMyFranchise();
        out.employees = r ?? [];
      })()
    );
  }
  if (need.has("areas")) {
    tasks.push(
      (async () => {
        const r = await fetchAreaRowsForMyFranchise();
        out.areas = r ?? [];
      })()
    );
  }
  if (need.has("services")) {
    tasks.push(
      (async () => {
        const r = await fetchServiceRowsForMyFranchise();
        out.services = r ?? [];
      })()
    );
  }
  if (need.has("categories")) {
    tasks.push(
      (async () => {
        const r = await fetchCategoryRowsForMyFranchise();
        out.categories = r ?? [];
      })()
    );
  }
  if (need.has("requested_services")) {
    tasks.push(
      (async () => {
        const raw = await fetchAllServiceRows(true);
        out.requested_services = (raw ?? [])
          .filter(includeInFranchisePendingRequests)
          .map(mapApiRequestedServiceRow);
      })()
    );
  }
  if (need.has("requested_categories")) {
    tasks.push(
      (async () => {
        const raw = await fetchAllCategoryRows(true);
        out.requested_categories = (raw ?? [])
          .filter(includeInFranchisePendingRequests)
          .map(mapApiRequestedCategoryRow);
      })()
    );
  }

  await Promise.all(tasks);
  return out;
}

export async function fetchMyFranchiseBoxData(): Promise<MyFranchiseBoxData> {
  const partial = await fetchMyFranchiseDataSlices(ALL_MY_FRANCHISE_SLICES);
  return {
    employees: partial.employees ?? [],
    areas: partial.areas ?? [],
    services: partial.services ?? [],
    categories: partial.categories ?? [],
    requested_services: partial.requested_services ?? [],
    requested_categories: partial.requested_categories ?? [],
  };
}

export async function setEmployeeChatEnabled(
  employee: EmployeeRow,
  chat_enabled: boolean
): Promise<boolean> {
  const keysFromRow =
    employee.screenPermissionKeys?.filter(
      (k) => !isFranchiseEmployeeExcludedScreenKey(k)
    ) ?? [];
  const keysFromScreens = menuKeysFromAvailablePages(
    employee.accessible_screens
  ).filter((k) => !isFranchiseEmployeeExcludedScreenKey(k));
  const screenPermissionKeys =
    keysFromRow.length > 0 ? keysFromRow : keysFromScreens;
  if (!screenPermissionKeys.length) {
    showErrorAlert(
      "Cannot update chat: missing screen permissions for this employee."
    );
    return false;
  }

  return updateFranchiseEmployee(employee._id, {
    name: employee.name,
    phone: employee.phone,
    email: employee.email,
    is_active: employee.is_active,
    chat_enabled: employee.is_active ? chat_enabled : false,
    screenPermissionKeys,
  });
}

async function ensureFranchiseServiceMapLoaded(): Promise<FranchiseServiceMapCache | null> {
  const fid = (await resolveSessionFranchiseId()) ?? "";
  if (!fid) return null;
  syncFranchiseMapCacheScope(fid);
  if (cachedFranchiseServiceMap?.services_list?.length) {
    return cachedFranchiseServiceMap;
  }
  const map = await fetchFranchiseServiceMapForFranchiseDeduped(fid);
  if (map?.services_list?.length) {
    cachedFranchiseServiceMap = map;
    return map;
  }
  return null;
}

async function ensureFranchiseCategoryMapLoaded(): Promise<FranchiseCategoryMapCache | null> {
  const fid = (await resolveSessionFranchiseId()) ?? "";
  if (!fid) return null;
  syncFranchiseMapCacheScope(fid);
  if (cachedFranchiseCategoryMap?.categories_list?.length) {
    return cachedFranchiseCategoryMap;
  }
  const map = await fetchFranchiseCategoryMapForFranchiseDeduped(fid);
  if (map?.categories_list?.length) {
    cachedFranchiseCategoryMap = map;
    return map;
  }
  return null;
}

function recordFromUpdateResponse(data: unknown): any | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const inner =
    d.data && typeof d.data === "object" && !Array.isArray(d.data)
      ? (d.data as Record<string, unknown>)
      : d;
  const rec = inner.record ?? d.record;
  return rec && typeof rec === "object" ? rec : null;
}

/**
 * Franchise-scoped active flag: `PUT /franchise-service/update/:mapId` with full
 * `services_list` (franchise admin contract). Falls back to `PUT /service/update/:id`
 * when no mapping row exists.
 */
export async function setServiceActive(
  id: string,
  is_active: boolean
): Promise<boolean> {
  const catalogueId = String(id ?? "").trim();
  if (!catalogueId) return false;

  const map = await ensureFranchiseServiceMapLoaded();
  if (map?.mapId && map.services_list.length) {
    const idx = findFranchiseServiceListIndex(map.services_list, catalogueId);
    if (idx >= 0) {
      const services_list = map.services_list.map((s, i) =>
        i === idx ? { service_id: s.service_id, is_active } : { ...s }
      );
      const body: Record<string, unknown> = {
        services_list,
        franchise_id: map.franchise_id,
      };
      if (map.active_services !== undefined) {
        body.active_services = map.active_services;
      }
      if (map.inactive_services !== undefined) {
        body.inactive_services = map.inactive_services;
      }
      if (map.order_number !== undefined) {
        body.order_number = map.order_number;
      }
      const response = await apiRequest(
        ApiPaths.UPDATE_FRANCHISE_SERVICE(map.mapId),
        "PUT",
        body,
        false,
        false,
        false,
        true
      );
      if (!response.success) return false;
      const rec = recordFromUpdateResponse(response.data);
      const hintPatch = rec
        ? buildServiceCatalogHintsFromRawList(rec.services_list)
        : {};
      if (rec) {
        const next = normalizeFranchiseServiceList(rec.services_list);
        if (next.length) {
          cachedFranchiseServiceMap = {
            ...map,
            services_list: next,
            serviceCatalogHints: {
              ...(map.serviceCatalogHints ?? {}),
              ...hintPatch,
            },
            active_services:
              typeof rec.active_services === "boolean"
                ? rec.active_services
                : map.active_services,
            inactive_services:
              typeof rec.inactive_services === "boolean"
                ? rec.inactive_services
                : map.inactive_services,
            order_number:
              typeof rec.order_number === "number"
                ? rec.order_number
                : map.order_number,
          };
        } else {
          cachedFranchiseServiceMap = {
            ...map,
            services_list,
            serviceCatalogHints: {
              ...(map.serviceCatalogHints ?? {}),
              ...hintPatch,
            },
          };
        }
      } else {
        cachedFranchiseServiceMap = { ...map, services_list };
      }
      return true;
    }
  }

  return false;
}

/**
 * Same pattern as services: `PUT /franchise-category/update/:mapId` with full
 * `categories_list` (no catalogue `PUT /category/update`).
 */
export async function setCategoryActive(
  id: string,
  is_active: boolean
): Promise<boolean> {
  const catalogueId = String(id ?? "").trim();
  if (!catalogueId) return false;

  const map = await ensureFranchiseCategoryMapLoaded();
  if (map?.mapId && map.categories_list.length) {
    const idx = findFranchiseCategoryListIndex(map.categories_list, catalogueId);
    if (idx >= 0) {
      const categories_list = map.categories_list.map((c, i) =>
        i === idx ? { category_id: c.category_id, is_active } : { ...c }
      );
      const body: Record<string, unknown> = {
        categories_list,
        franchise_id: map.franchise_id,
      };
      if (map.active_categories !== undefined) {
        body.active_categories = map.active_categories;
      }
      if (map.inactive_categories !== undefined) {
        body.inactive_categories = map.inactive_categories;
      }
      if (map.order_number !== undefined) {
        body.order_number = map.order_number;
      }
      const response = await apiRequest(
        ApiPaths.UPDATE_FRANCHISE_CATEGORY(map.mapId),
        "PUT",
        body,
        false,
        false,
        false,
        true
      );
      if (!response.success) return false;
      const rec = recordFromUpdateResponse(response.data);
      if (rec) {
        const next = normalizeFranchiseCategoryList(rec.categories_list);
        if (next.length) {
          cachedFranchiseCategoryMap = {
            ...map,
            categories_list: next,
            active_categories:
              typeof rec.active_categories === "boolean"
                ? rec.active_categories
                : map.active_categories,
            inactive_categories:
              typeof rec.inactive_categories === "boolean"
                ? rec.inactive_categories
                : map.inactive_categories,
            order_number:
              typeof rec.order_number === "number"
                ? rec.order_number
                : map.order_number,
          };
        } else {
          cachedFranchiseCategoryMap = { ...map, categories_list };
        }
      } else {
        cachedFranchiseCategoryMap = { ...map, categories_list };
      }
      return true;
    }
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
  /** Required when creating a new employee (`createFranchiseEmployee`). */
  password?: string;
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

  const pwd = String(input.password ?? "").trim();
  if (!pwd) {
    showErrorAlert("Password is required.");
    return false;
  }

  const res = await createWebManagementUser({
    name: input.name.trim(),
    email: input.email.trim(),
    phone_number: input.phone.trim(),
    type: WEB_MANAGEMENT_USER_TYPE.FRANCHISE_EMPLOYEE,
    password: pwd,
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
  const userId = String(id ?? "").trim();
  if (!userId) {
    showErrorAlert("Unable to update. ID is missing.");
    return false;
  }

  const keys = (input.screenPermissionKeys ?? []).filter(
    (k) => !isFranchiseEmployeeExcludedScreenKey(k)
  );
  const availablePages = mapMenuKeysToAvailablePages(keys);

  const franchiseId = (await resolveSessionFranchiseId())?.trim();
  if (!franchiseId) {
    showErrorAlert("Franchise context is missing. Please log in again.");
    return false;
  }

  const isActive = Boolean(input.is_active);
  const status = isActive ? "active" : "inactive";
  const body: Record<string, unknown> = {
    name: input.name.trim(),
    email: input.email.trim(),
    phone_number: normalizePhoneForUserCreate(input.phone.trim()),
    status,
    is_active: isActive,
    franchise_id: franchiseId,
    available_pages: availablePages,
    accessible_screens: availablePages,
    chat: isActive ? Boolean(input.chat_enabled) : false,
  };

  const res = await apiRequest(
    ApiPaths.UPDATE_USER(userId),
    "PUT",
    body,
    false,
    false,
    false,
    true
  );
  return Boolean(res.success);
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
  const imageUrl = String(input.image_url ?? "").trim();
  const payload = {
    name: input.name.trim(),
    category_id: input.category_id,
    desc: input.description.trim(),
    ...(imageUrl ? { image_url: imageUrl } : {}),
    tax: 0,
    commission: 0,
    payment_type: "per_hour",
    minimum_deposit: 0,
    price: 0,
    is_active: false,
    city_ids: [] as string[],
    state_ids: [] as string[],
    ...(franchiseId ? { franchise_id: franchiseId } : {}),
    is_request: true,
  };
  const response = await apiRequest(
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
  const imageUrl = String(input.image_url ?? "").trim();
  const payload = {
    name: input.name.trim(),
    category_id: input.category_id,
    desc: input.description.trim(),
    ...(imageUrl ? { image_url: imageUrl } : {}),
    tax: 0,
    commission: 0,
    payment_type: "per_hour",
    minimum_deposit: 0,
    price: 0,
    is_active: false,
    city_ids: [] as string[],
    state_ids: [] as string[],
    is_request: true,
  };
  const response = await apiRequest(
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
  const response = await apiRequest(
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
  /** Omitted or empty when the request does not attach catalogue services yet. */
  service_ids?: string[];
  description: string;
  image_url?: string;
};

export async function createRequestedCategory(
  input: RequestedCategoryInput
): Promise<boolean> {
  const franchiseId = await resolveSessionFranchiseId();
  const payload = {
    name: input.name.trim(),
    service_ids: input.service_ids ?? [],
    desc: input.description.trim(),
    ...(input.image_url ? { image_url: input.image_url } : {}),
    city_ids: [] as string[],
    state_ids: [] as string[],
    ...(franchiseId ? { franchise_id: franchiseId } : {}),
    is_request: true,
  };
  const response = await apiRequest(
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
    service_ids: input.service_ids ?? [],
    desc: input.description.trim(),
    ...(input.image_url ? { image_url: input.image_url } : {}),
    city_ids: [] as string[],
    state_ids: [] as string[],
    is_request: true,
    is_active: false,
  };
  const response = await apiRequest(
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
  const response = await apiRequest(
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
