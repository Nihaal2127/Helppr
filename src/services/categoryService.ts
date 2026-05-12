import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";
import { CategoryModel } from "../models/CategoryModel";
import { showLog } from "../helper/utility";
import type { ServerTableSortBy } from "../helper/serverTableSort";

/** Hoisted so helpers below never see an uninitialized binding (HMR / circular import edge cases). */
export async function fetchCategoryDropDown(
  cityId?: string
): Promise<{ value: string; label: string }[]> {
  const params = new URLSearchParams({
    ...(cityId && { city_id: cityId }),
  });
  const response = await apiRequest(
    `${ApiPaths.GET_CATEGORY_DROP_DOWN()}?${params.toString()}`,
    "GET"
  );

  if (response.success) {
    return response.data.records.map((category: any) => ({
      value: String(category._id ?? ""),
      label: String(category.name ?? ""),
    }));
  } else {
    showLog(response.message || "Failed to fetch category");
    return [];
  }
}

export const fetchCategory = async (
  page: number,
  pageSize: number,
  filters: {
    keyword?: string;
    status?: string;
    sort?: string;
    is_request?: string;
    is_rejected?: string;
  },
  sortBy: ServerTableSortBy = []
): Promise<{
  response: boolean;
  categories: CategoryModel[];
  totalPages: number;
  totalRecords: number;
}> => {
  const primarySort = sortBy[0];
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
  });

  const response = await apiRequest(
    `${ApiPaths.GET_CATEGORY()}?${params.toString()}`,
    "GET"
  );

  if (response.success) {
    return {
      response: true,
      categories: response.data.records,
      totalPages: response.data.totalPages,
      totalRecords: Number(
        response.data.totalRecords ??
          response.data.total ??
          response.data.count ??
          (Array.isArray(response.data.records) ? response.data.records.length : 0)
      ),
    };
  } else {
    showLog(response.message || "Failed to fetch category");
    return {
      response: false,
      categories: [],
      totalPages: 0,
      totalRecords: 0,
    };
  }
};

/**
 * Options for admin catalogue UIs (e.g. assign service → category).
 * Paginates `GET /category/getAll` so the list is not limited like `getDropDown`,
 * then merges `getDropDown` rows so nothing is missing if APIs differ.
 */
export const fetchCategoriesAsSelectOptions = async (opts?: {
  pageSize?: number;
  filters?: {
    keyword?: string;
    status?: string;
    sort?: string;
    is_request?: string;
    is_rejected?: string;
  };
}): Promise<{ value: string; label: string }[]> => {
  const pageSize = opts?.pageSize ?? 200;
  const filters = opts?.filters ?? {};
  const byId = new Map<string, { value: string; label: string }>();
  let page = 1;
  for (;;) {
    const res = await fetchCategory(page, pageSize, filters, []);
    if (!res.response) break;
    for (const c of res.categories) {
      const id = String((c as { _id?: string })._id ?? "").trim();
      if (!id) continue;
      byId.set(id, {
        value: id,
        label:
          String((c as { name?: string }).name ?? "").trim() || id,
      });
    }
    if (!res.totalPages || page >= res.totalPages) break;
    page += 1;
    if (page > 50) break;
  }
  try {
    const drop = await fetchCategoryDropDown();
    for (const o of drop) {
      if (o.value && !byId.has(o.value)) byId.set(o.value, o);
    }
  } catch {
    /* ignore */
  }
  return Array.from(byId.values()).sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
  );
};

export const deleteCategory = async (id: string): Promise<boolean> => {
  const response = await apiRequest(ApiPaths.DELETE_CATEGORY(id), "DELETE");
  if (response.success) {
    return true;
  } else {
    showLog(response.message || "Failed to delete category");
    return false;
  }
};

export const fetchCategoryById = async (
  id: string
): Promise<{ response: boolean; category: CategoryModel | null }> => {
  const response = await apiRequest(ApiPaths.GET_CATEGORY_BY_ID(id), "GET");
  if (response.success) {
    const payload = (response as any).data ?? {};
    const record =
      payload.record ??
      payload.category ??
      payload.data?.record ??
      payload.data?.category ??
      (payload.data && typeof payload.data === "object" && payload.data._id
        ? payload.data
        : null);
    return {
      response: true,
      category: (record as CategoryModel | null) ?? null,
    };
  }
  return { response: false, category: null };
};

export const createOrUpdateCategory = async (
  payload: any,
  isEditable: boolean,
  id?: string
): Promise<boolean> => {
  const result = await createOrUpdateCategoryWithRecord(payload, isEditable, id);
  return result.response;
};

export const createOrUpdateCategoryWithRecord = async (
  payload: any,
  isEditable: boolean,
  id?: string
): Promise<{ response: boolean; record: CategoryModel | null }> => {
  const isRequestRow = payload?.is_request === true;
  const isModerationCall = payload?.is_rejected === true || payload?.is_rejected === false;
  const path = isEditable
    ? isModerationCall
      ? ApiPaths.UPDATE_CATEGORY(id!)
      : isRequestRow
      ? ApiPaths.UPDATE_CATEGORY_REQUEST(id!)
      : ApiPaths.UPDATE_CATEGORY(id!)
    : isRequestRow
    ? ApiPaths.CREATE_CATEGORY_REQUEST
    : ApiPaths.CREATE_CATEGORY;
  const method = isEditable ? "PUT" : "POST";

  const response = await apiRequest(path, method, payload);
  if (response.success) {
    return {
      response: true,
      record: (response.data?.record ?? response.data?.records?.[0] ?? null) as
        | CategoryModel
        | null,
    };
  }
  return { response: false, record: null };
};
