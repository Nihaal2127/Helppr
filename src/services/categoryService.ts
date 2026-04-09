import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";
import { CategoryModel } from "../models/CategoryModel";
import { showLog } from "../helper/utility";
import type { ServerTableSortBy } from "../helper/serverTableSort";

export const fetchCategoryDropDown = async (cityId?: string
): Promise<{ value: string; label: string }[]> => {
  const params = new URLSearchParams({
    ...(cityId && { city_id: cityId }),
  });
  const response = await apiRequest(
    `${ApiPaths.GET_CATEGORY_DROP_DOWN()}?${params.toString()}`,
    "GET"
  );

  if (response.success) {
    return response.data.records.map((category: any) => ({
      value: category._id,
      label: category.name,
    }));
  } else {
    showLog(response.message || "Failed to fetch category");
    return [];
  }
};

export const fetchCategory = async (
  page: number,
  pageSize: number,
  filters: { keyword?: string; status?: string; sort?: string; },
  sortBy: ServerTableSortBy = []
): Promise<{ response: boolean, categories: CategoryModel[]; totalPages: number }> => {
  const primarySort = sortBy[0];
  const params = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
    ...(filters.keyword && { keyword: filters.keyword }),
    ...(filters.status && filters.status !== "All" && { is_active: filters.status.toLowerCase() }),
    ...(filters.sort && { sort: filters.sort }),
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
    };
  } else {
    showLog(response.message || "Failed to fetch category");
    return {
      response: false,
      categories: [],
      totalPages: 0,
    };
  }
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

export const createOrUpdateCategory = async (
  payload: any,
  isEditable: boolean,
  id?: string
): Promise<boolean> => {
  const path = isEditable ? ApiPaths.UPDATE_CATEGORY(id!) : ApiPaths.CREATE_CATEGORY;
  const method = isEditable ? "PUT" : "POST";

  const response = await apiRequest(path, method, payload);
  if (response.success) {
    return true;
  }
  return false;
};
