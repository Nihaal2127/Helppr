import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";
import { CityModel } from "../models/CityModel";
import { showLog } from "../helper/utility";
import type { ServerTableSortBy } from "../helper/serverTableSort";

export const fetchCityDropDown = async (
  stateIdList?: string[],
): Promise<{ value: string; label: string; state_id?: string }[]> => {
  const params = stateIdList ? new URLSearchParams({ state_id: stateIdList.toString() }) : "";

  const response = await apiRequest(
    `${ApiPaths.GET_CITY_DROP_DOWN()}${params ? `?${params.toString()}` : ""}`,
    "GET"
  );

  if (response.success) {
    return response.data.records.map((city: any) => ({
      value: city._id,
      label: city.name,
      state_id: city.state_id,
    }));
  } else {
    showLog(response.message || "Failed to fetch city");
    return [];
  }
};

export const fetchCity = async (
  page: number,
  pageSize: number,
  filters: { name?: string; status?: string; sort?: string; state_id?: string; },
  sortBy: ServerTableSortBy = []
): Promise<{ response: boolean, cities: CityModel[]; totalPages: number }> => {
  const primarySort = sortBy[0];
  const params = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
    ...(filters.name && { name: filters.name }),
    ...(filters.name && { keyword: filters.name }),
    ...(filters.status && filters.status !== "All" && { is_active: filters.status.toLowerCase() }),
    ...(filters.sort && { sort: filters.sort }),
    ...(filters.state_id && { state_id: filters.state_id }),
    ...(primarySort?.id && { sort_by: primarySort.id }),
    ...(primarySort && { sort_order: primarySort.desc ? "desc" : "asc" }),
  });

  const response = await apiRequest(
    `${ApiPaths.GET_CITY()}?${params.toString()}`,
    "GET"
  );

  if (response.success) {
    return {
      response: true,
      cities: response.data.records,
      totalPages: response.data.totalPages,
    };
  } else {
    showLog(response.message || "Failed to fetch city");
    return {
      response: false,
      cities: [],
      totalPages: 0,
    };
  }
};

export const deleteCity = async (id: string): Promise<boolean> => {
  const response = await apiRequest(ApiPaths.DELETE_CITY(id), "DELETE");
  if (response.success) {
    return true;
  } else {
    showLog(response.message || "Failed to delete city");
    return false;
  }
};

export const createOrUpdateCity = async (
  payload: any,
  isEditable: boolean,
  id?: string
): Promise<boolean> => {
  const path = isEditable ? ApiPaths.UPDATE_CITY(id!) : ApiPaths.CREATE_CITY;
  const method = isEditable ? "PUT" : "POST";

  const response = await apiRequest(path, method, payload);
  if (response.success) {
    return true;
  }
  return false;
};
