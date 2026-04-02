import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";
import { AreaModel } from "../models/AreaModel";
import { showLog } from "../helper/utility";

export const fetchAreaDropDown = async (): Promise<{ value: string; label: string }[]> => {
  const response = await apiRequest(
    `${ApiPaths.GET_AREA_DROP_DOWN()}`,
    "GET"
  );

  if (response.success) {
    return response.data.records.map((area: any) => ({
      value: area._id,
      label: area.name,
    }));
  } else {
    showLog(response.message || "Failed to fetch area");
    return [];
  }
};

export const fetchArea = async (
  page: number,
  pageSize: number,
  filters: { name?: string; status?: string; sort?: string; state_id?: string; city_id?: string; franchise_id?: string }
): Promise<{ response: boolean; areas: AreaModel[]; totalPages: number }> => {

  const params = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
    ...(filters.name && { name: filters.name }),
    ...(filters.status && filters.status !== "All" && { is_active: filters.status.toLowerCase() }),
    ...(filters.sort && { sort: filters.sort }),
    ...(filters.state_id && { state_id: filters.state_id }),
    ...(filters.city_id && { city_id: filters.city_id }),
    ...(filters.franchise_id && { franchise_id: filters.franchise_id }),
  });

  const response = await apiRequest(
    `${ApiPaths.GET_AREA()}?${params.toString()}`,
    "GET"
  );

  if (response.success) {
    return {
      response: true,
      areas: response.data.records,
      totalPages: response.data.totalPages,
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