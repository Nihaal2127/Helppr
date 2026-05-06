import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";
import { AreaModel } from "../models/AreaModel";
import { showLog } from "../helper/utility";
import { fetchMockAreas } from "./areaMockService";
import type { ServerTableSortBy } from "../helper/serverTableSort";

const USE_MOCK_AREA_API = false;

export const fetchAreaDropDown = async (
  cityId?: string,
  stateId?: string
): Promise<{ value: string; label: string }[]> => {
  const q = new URLSearchParams();
  if (cityId?.trim()) q.set("city_id", cityId.trim());
  if (stateId?.trim()) q.set("state_id", stateId.trim());
  const qs = q.toString();
  const response = await apiRequest(
    `${ApiPaths.GET_AREA_DROP_DOWN()}${qs ? `?${qs}` : ""}`,
    "GET"
  );

  const data = (response as any).data;
  const records = data?.records ?? (Array.isArray(data) ? data : []);
  if (response.success && Array.isArray(records)) {
    return records
      .map((area: any) => ({
        value: String(area._id ?? area.id ?? ""),
        label: String(area.name ?? area.label ?? ""),
      }))
      .filter((o: { value: string; label: string }) => o.value);
  } else {
    showLog(response.message || "Failed to fetch area");
    return [];
  }
};

export const fetchArea = async (
  page: number,
  pageSize: number,
  filters: {
    name?: string;
    status?: string;
    sort?: string;
    state_id?: string;
    city_id?: string;
    franchise_id?: string;
  },
  sortBy: ServerTableSortBy = []
): Promise<{ response: boolean; areas: AreaModel[]; totalPages: number }> => {
  const primarySort = sortBy[0];
  if (USE_MOCK_AREA_API) {
    return fetchMockAreas(page, pageSize, filters);
  }

  const params = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
    ...(filters.name && { name: filters.name }),
    ...(filters.name && { keyword: filters.name }),
    ...(filters.status &&
      filters.status !== "All" && { is_active: filters.status.toLowerCase() }),
    ...(filters.sort && { sort: filters.sort }),
    ...(filters.state_id && { state_id: filters.state_id }),
    ...(filters.city_id && { city_id: filters.city_id }),
    ...(filters.franchise_id && { franchise_id: filters.franchise_id }),
    ...(primarySort?.id && { sort_by: primarySort.id }),
    ...(primarySort && { sort_order: primarySort.desc ? "desc" : "asc" }),
  });

  const response = await apiRequest(
    `${ApiPaths.GET_AREA()}?${params.toString()}`,
    "GET"
  );

  if (response.success) {
    const d = (response as any).data ?? {};
    const list = d.records ?? d.data?.records;
    const pages = d.totalPages ?? d.data?.totalPages;
    return {
      response: true,
      areas: Array.isArray(list) ? list : [],
      totalPages: typeof pages === "number" ? pages : 0,
    };
  } else {
    showLog(response.message || "Failed to fetch area");
    return {
      response: false,
      areas: [],
      totalPages: 0,
    };
  }
};

export const deleteArea = async (id: string): Promise<boolean> => {
  const response = await apiRequest(ApiPaths.DELETE_AREA(id), "DELETE");
  if (response.success) return true;

  showLog(response.message || "Failed to delete area");
  return false;
};

export const createOrUpdateArea = async (
  payload: any,
  isEditable: boolean,
  id?: string
): Promise<boolean> => {
  const path = isEditable ? ApiPaths.UPDATE_AREA(id!) : ApiPaths.CREATE_AREA;
  const method = isEditable ? "PUT" : "POST";

  const response = await apiRequest(path, method, payload);
  return response.success;
};
