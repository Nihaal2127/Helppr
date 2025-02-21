import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";
import { ServiceModel } from "../models/ServiceModel";

export const fetchServiceDropDown =async (
): Promise<{ value: string; label: string }[]> => {
    const response = await apiRequest(
      `${ApiPaths.GET_SERVICE_DROP_DOWN()}`,
      "GET"
    );

    if (response.success) {
      return response.data.records.map((state: any) => ({
        value: state._id,
        label: state.name,
      }));
    } else {
      console.log(response.message ||"Failed to fetch service");
      return [];
    }
};

export const fetchService = async (
  page: number,
  pageSize: number,
  filters: { name?: string; status?: string }
): Promise<{ response: boolean, services: ServiceModel[]; totalPages: number }> => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
    ...(filters.name && { name: filters.name }),
    ...(filters.status && filters.status !== "All" && { is_active: filters.status.toLowerCase() }),
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
    console.log(response.message ||"Failed to fetch service");
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
    console.log(response.message ||"Failed to delete service");
    return false;
  }
};

export const createOrUpdateService= async (
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
