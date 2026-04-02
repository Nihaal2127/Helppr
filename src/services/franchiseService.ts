import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";
import { FranchiseModel } from "../models/FranchiseModels";
import { showLog } from "../helper/utility";

export const fetchFranchiseDropDown = async (): Promise<{ value: string; label: string }[]> => {
  const response = await apiRequest(
    `${ApiPaths.GET_FRANCHISE_DROP_DOWN()}`,
    "GET"
  );

  if (response.success) {
    return response.data.records.map((franchise: any) => ({
      value: franchise._id,
      label: franchise.name,
    }));
  } else {
    showLog(response.message || "Failed to fetch franchise");
    return [];
  }
};

export const fetchFranchise = async (
  page: number,
  pageSize: number,
  filters: { name?: string; status?: string; sort?: string }
): Promise<{ response: boolean; franchises: FranchiseModel[]; totalPages: number }> => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
    ...(filters.name && { name: filters.name }),
    ...(filters.status && filters.status !== "All" && { is_active: filters.status.toLowerCase() }),
    ...(filters.sort && { sort: filters.sort }),
  });

  const response = await apiRequest(
    `${ApiPaths.GET_FRANCHISE()}?${params.toString()}`,
    "GET"
  );

  if (response.success) {
    return {
      response: true,
      franchises: response.data.records,
      totalPages: response.data.totalPages,
    };
  } else {
    showLog(response.message || "Failed to fetch franchise");
    return {
      response: false,
      franchises: [],
      totalPages: 0,
    };
  }
};

export const deleteFranchise = async (id: string): Promise<boolean> => {
  const response = await apiRequest(ApiPaths.DELETE_FRANCHISE(id), "DELETE");

  if (response.success) {
    return true;
  } else {
    showLog(response.message || "Failed to delete franchise");
    return false;
  }
};

export const createOrUpdateFranchise = async (
  payload: any,
  isEditable: boolean,
  id?: string
): Promise<boolean> => {
  const path = isEditable ? ApiPaths.UPDATE_FRANCHISE(id!) : ApiPaths.CREATE_FRANCHISE;
  const method = isEditable ? "PUT" : "POST";

  const response = await apiRequest(path, method, payload);

  if (response.success) {
    return true;
  }
  return false;
};