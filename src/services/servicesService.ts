import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";
import { ServiceModel } from "../models/ServiceModel";
import { showLog } from "../helper/utility";
import type { ServerTableSortBy } from "../helper/serverTableSort";

export const fetchServiceDropDown = async (
  categoryId?: string
): Promise<{ value: string; label: string; price?: number }[]> => {
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
      price: service.price,
    }));
  } else {
    showLog(response.message || "Failed to fetch service");
    return [];
  }
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
  },
  sortBy: ServerTableSortBy = []
): Promise<{
  response: boolean;
  services: ServiceModel[];
  totalPages: number;
  totalRecords: number;
}> => {
  const primarySort = sortBy[0];
  const params = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
    ...(filters.keyword && { keyword: filters.keyword }),
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
    `${ApiPaths.GET_SERVICE()}?${params.toString()}`,
    "GET"
  );

  if (response.success) {
    return {
      response: true,
      services: response.data.records,
      totalPages: response.data.totalPages,
      totalRecords: Number(
        response.data.totalRecords ??
          response.data.total ??
          response.data.count ??
          (Array.isArray(response.data.records) ? response.data.records.length : 0)
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
    return {
      response: true,
      service: response.data.record ?? null,
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
