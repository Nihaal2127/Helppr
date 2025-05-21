import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";
import { ServiceModel } from "../models/ServiceModel";
import { showLog } from "../helper/utility";

export const fetchServiceDropDown = async (categoryId ?: string
): Promise<{ value: string; label: string,price?: number }[]> => {
  const params = new URLSearchParams({
    ...(categoryId && { category_id: categoryId }),
  });

  const response = await apiRequest(
    `${ApiPaths.GET_SERVICE_DROP_DOWN()}?${params.toString()}`,
    "GET"
  );

  if (response.success) {
    return response.data.records.map((service: any) => ({
      value: service._id,
      label: service.name,
      price: service.price
    }));
  } else {
    showLog(response.message || "Failed to fetch service");
    return [];
  }
};

export const fetchService = async (
  page: number,
  pageSize: number,
  filters: { keyword?: string; status?: string ; sort?: string; }
): Promise<{ response: boolean, services: ServiceModel[]; totalPages: number }> => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
    ...(filters.keyword && { keyword: filters.keyword }),
    ...(filters.status && filters.status !== "All" && { is_active: filters.status.toLowerCase() }),
  ...(filters.sort && { sort: filters.sort }),
  });

  const response = await apiRequest(
    `${ApiPaths.GET_SERVICE()}?${params.toString()}`,
    "GET"
  );

  if (response.success) {
    return {
      response: true,
      services: response.data.records,
      totalPages: response.data.totalPages,
    };
  } else {
    showLog(response.message || "Failed to fetch service");
    return {
      response: false,
      services: [],
      totalPages: 0,
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

export const createOrUpdateService = async (
  payload: any,
  isEditable: boolean,
  id?: string
): Promise<boolean> => {
  const path = isEditable ? ApiPaths.UPDATE_SERVICE(id!) : ApiPaths.CREATE_SERVICE;
  const method = isEditable ? "PUT" : "POST";

  const response = await apiRequest(path, method, payload);
  if (response.success) {
    return true;
  }
  return false;
};
