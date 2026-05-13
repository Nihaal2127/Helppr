import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";
import { ServiceModel } from "../models/ServiceModel";
import { showLog } from "../helper/utility";
import type { ServerTableSortBy } from "../helper/serverTableSort";

export type ServiceDropDownOption = {
  value: string;
  label: string;
  price?: number;
  /** Present when options are built from franchise catalogue (filter by category in UI). */
  category_id?: string;
  /** Billing cadence from API (`per_hour`, `per_day`, …) — drives quote schedule UI. */
  payment_type?: string;
};

export const fetchServiceDropDown = async (
  categoryId?: string
): Promise<ServiceDropDownOption[]> => {
  const params = new URLSearchParams({
    ...(categoryId && { category_id: categoryId }),
  });

  const response = await apiRequest(
    `${ApiPaths.GET_SERVICE_DROP_DOWN()}?${params.toString()}`,
    "GET"
  );

  if (response.success) {
    return response.data.records.map((service: any) => ({
      value: String(service._id ?? ""),
      label: String(service.name ?? ""),
      price: service.price,
      payment_type: String(
        service.payment_type ?? service.min_deposit_type ?? ""
      ).trim(),
    }));
  } else {
    showLog(response.message || "Failed to fetch service");
    return [];
  }
};

/** Resolves `category_id` whether API sends a string id or a populated `{ _id, name }`. */
export function normalizeServiceCategoryRef(id: unknown): string {
  if (id == null) return "";
  if (typeof id === "object") {
    const o = id as Record<string, unknown>;
    const cand = o._id ?? o.id ?? o.category_id;
    if (cand != null && typeof cand === "object") {
      return normalizeServiceCategoryRef(cand);
    }
    if (cand != null) {
      const s = String(cand).trim();
      if (s && s !== "undefined" && s !== "null") return s;
    }
    return "";
  }
  const s = String(id).trim();
  if (!s || s === "undefined" || s === "null" || s === "[object Object]") return "";
  return s;
}

type ServiceDropDownRowWithCat = {
  value: string;
  label: string;
  price?: number;
  cat: string;
};

function toDropDownOption(
  r: ServiceDropDownRowWithCat
): { value: string; label: string; price?: number } {
  return { value: r.value, label: r.label, price: r.price };
}

/**
 * Category add/edit: each service belongs to at most one category.
 * - **add** — only services with no `category_id`, plus (when `categoryId` is set) services already on that draft/saved category so the multiselect stays consistent.
 * - **edit** — only services whose `category_id` matches this category.
 *
 * Uses unfiltered `GET /service/getDropDown` and filters on `category_id` from each record (see Postman: records include `category_id`).
 */
export const fetchServicesForCategoryDialog = async (opts: {
  mode: "add" | "edit";
  /** Draft or saved category id for add-with-draft; required for edit (via `mode`). */
  categoryId?: string;
}): Promise<{ value: string; label: string; price?: number }[]> => {
  const response = await apiRequest(`${ApiPaths.GET_SERVICE_DROP_DOWN()}`, "GET");

  if (!response.success) {
    showLog(response.message || "Failed to fetch service");
    return [];
  }

  const rawRecords = response.data?.records;
  const records: unknown[] = Array.isArray(rawRecords) ? rawRecords : [];

  const rows: ServiceDropDownRowWithCat[] = [];
  for (const item of records) {
    const service = item as Record<string, unknown>;
    const value = String(service._id ?? "");
    if (!value) continue;
    rows.push({
      value,
      label: String(service.name ?? ""),
      price: service.price as number | undefined,
      cat: normalizeServiceCategoryRef(service.category_id),
    });
  }

  if (opts.mode === "edit") {
    const id = normalizeServiceCategoryRef(opts.categoryId);
    if (!id) return [];
    const out: { value: string; label: string; price?: number }[] = [];
    for (const r of rows) {
      if (r.cat === id) out.push(toDropDownOption(r));
    }
    return out;
  }

  const allow = normalizeServiceCategoryRef(opts.categoryId);
  const out: { value: string; label: string; price?: number }[] = [];
  for (const r of rows) {
    if (allow) {
      if (!r.cat || r.cat === allow) out.push(toDropDownOption(r));
    } else if (!r.cat) {
      out.push(toDropDownOption(r));
    }
  }
  return out;
};

export const fetchService = async (
  page: number,
  pageSize: number,
  filters: {
    keyword?: string;
    status?: string;
    sort?: string;
    is_request?: string;
    is_rejected?: string;
    /** `GET /service/getAll` — scope catalogue rows when API supports it (see `apiPaths`). */
    city_id?: string;
    state_id?: string;
  },
  sortBy: ServerTableSortBy = []
): Promise<{
  response: boolean;
  services: ServiceModel[];
  totalPages: number;
  totalRecords: number;
}> => {
  const primarySort = sortBy[0];
  const cityId = String(filters.city_id ?? "").trim();
  const stateId = String(filters.state_id ?? "").trim();
  const params = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
    ...(filters.keyword && { search: filters.keyword }),
    ...(filters.status &&
      filters.status !== "All" && { is_active: filters.status.toLowerCase() }),
    ...(filters.sort && { sort: filters.sort }),
    ...(filters.is_request !== undefined &&
      filters.is_request !== "" && { is_request: filters.is_request }),
    ...(filters.is_rejected !== undefined &&
      filters.is_rejected !== "" && { is_rejected: filters.is_rejected }),
    ...(primarySort?.id && { sort_by: primarySort.id }),
    ...(primarySort && { sort_order: primarySort.desc ? "desc" : "asc" }),
    ...(cityId && { city_id: cityId }),
    ...(stateId && { state_id: stateId }),
  });

  const response = await apiRequest(
    `${ApiPaths.GET_SERVICE()}?${params.toString()}`,
    "GET"
  );

  if (response.success) {
    const payload = (response as { data?: unknown }).data;
    const rawRecords =
      payload &&
      typeof payload === "object" &&
      Array.isArray((payload as { records?: unknown }).records)
        ? (payload as { records: ServiceModel[] }).records
        : payload &&
            typeof payload === "object" &&
            (payload as { data?: { records?: unknown } }).data &&
            Array.isArray(
              (payload as { data: { records?: unknown } }).data.records
            )
        ? (payload as { data: { records: ServiceModel[] } }).data.records
        : [];

    return {
      response: true,
      services: rawRecords,
      totalPages: Number(
        (payload as { totalPages?: number })?.totalPages ??
          (payload as { data?: { totalPages?: number } })?.data?.totalPages ??
          0
      ),
      totalRecords: Number(
        (payload as { totalRecords?: number })?.totalRecords ??
          (payload as { total?: number })?.total ??
          (payload as { count?: number })?.count ??
          (Array.isArray(rawRecords) ? rawRecords.length : 0)
      ),
    };
  } else {
    showLog(response.message || "Failed to fetch service");
    return {
      response: false,
      services: [],
      totalPages: 0,
      totalRecords: 0,
    };
  }
};

export const deleteService = async (id: string): Promise<boolean> => {
  const response = await apiRequest(ApiPaths.DELETE_SERVICE(id), "DELETE");
  if (response.success) {
    return true;
  } else {
    showLog(response.message || "Failed to delete service");
    return false;
  }
};

export const fetchServiceById = async (
  id: string
): Promise<{ response: boolean; service: ServiceModel | null }> => {
  const response = await apiRequest(ApiPaths.GET_SERVICE_BY_ID(id), "GET");
  if (response.success) {
    const payload = (response as any).data ?? {};
    const record =
      payload.record ??
      payload.service ??
      payload.data?.record ??
      payload.data?.service ??
      (payload.data && typeof payload.data === "object" && payload.data._id
        ? payload.data
        : null);
    return {
      response: true,
      service: (record as ServiceModel | null) ?? null,
    };
  }
  return { response: false, service: null };
};

export const createOrUpdateService = async (
  payload: any,
  isEditable: boolean,
  id?: string
): Promise<boolean> => {
  const isRequestRow = payload?.is_request === true;
  const isModerationCall = payload?.is_rejected === true || payload?.is_rejected === false;
  const path = isEditable
    ? isModerationCall
      ? ApiPaths.UPDATE_SERVICE(id!)
      : isRequestRow
      ? ApiPaths.UPDATE_SERVICE_REQUEST(id!)
      : ApiPaths.UPDATE_SERVICE(id!)
    : isRequestRow
    ? ApiPaths.CREATE_SERVICE_REQUEST
    : ApiPaths.CREATE_SERVICE;
  const method = isEditable ? "PUT" : "POST";

  const response = await apiRequest(path, method, payload);
  if (response.success) {
    return true;
  }
  return false;
};
