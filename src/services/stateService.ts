import { apiRequest } from "../lib/global/remote/apiHelper";
import { ApiPaths } from "../lib/global/remote/apiPaths";
import { StateModel } from "../lib/models/StateModel";
import { showLog } from "../helper/utility";
import type { ServerTableSortBy } from "../lib/global/serverTableSort";

export const fetchStateDropDown = async (): Promise<
  { value: string; label: string }[]
> => {
  const response = await apiRequest(`${ApiPaths.GET_STATE_DROP_DOWN()}`, "GET");

  if (response.success) {
    return response.data.records.map((state: any) => ({
      value: state._id,
      label: state.name,
    }));
  } else {
    showLog(response.message || "Failed to fetch state");
    return [];
  }
};

export const fetchState = async (
  page: number,
  pageSize: number,
  filters: { name?: string; status?: string; sort?: string },
  sortBy: ServerTableSortBy = []
): Promise<{ response: boolean; states: StateModel[]; totalPages: number }> => {
  const primarySort = sortBy[0];
  const nameQuery = String(filters.name ?? "").trim();
  const statusRaw = String(filters.status ?? "").trim().toLowerCase();
  const normalizedIsActive =
    statusRaw === "all" || statusRaw === ""
      ? ""
      : statusRaw === "active" || statusRaw === "true"
      ? "true"
      : statusRaw === "inactive" || statusRaw === "false"
      ? "false"
      : statusRaw;
  const params = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
    ...(nameQuery && { name: nameQuery }),
    ...(nameQuery && { keyword: nameQuery }),
    ...(nameQuery && { search: nameQuery }),
    ...(normalizedIsActive && { is_active: normalizedIsActive }),
    ...(normalizedIsActive && { isActive: normalizedIsActive }),
    ...(filters.sort && { sort: filters.sort }),
    ...(primarySort?.id && { sort_by: primarySort.id }),
    ...(primarySort?.id && { sortBy: primarySort.id }),
    ...(primarySort && { sort_order: primarySort.desc ? "desc" : "asc" }),
    ...(primarySort && { sortOrder: primarySort.desc ? "desc" : "asc" }),
  });

  const response = await apiRequest(
    `${ApiPaths.GET_STATE()}?${params.toString()}`,
    "GET"
  );

  if (response.success) {
    return {
      response: true,
      states: response.data.records,
      totalPages: response.data.totalPages,
    };
  } else {
    showLog(response.message || "Failed to fetch state");
    return {
      response: false,
      states: [],
      totalPages: 0,
    };
  }
};

export const deleteState = async (id: string): Promise<boolean> => {
  const response = await apiRequest(ApiPaths.DELETE_STATE(id), "DELETE");
  if (response.success) {
    return true;
  } else {
    showLog(response.message || "Failed to delete state");
    return false;
  }
};

export const createOrUpdateState = async (
  payload: any,
  isEditable: boolean,
  id?: string
): Promise<boolean> => {
  const path = isEditable ? ApiPaths.UPDATE_STATE(id!) : ApiPaths.CREATE_STATE;
  const method = isEditable ? "PUT" : "POST";

  const response = await apiRequest(path, method, payload);
  if (response.success) {
    return true;
  }
  return false;
};
