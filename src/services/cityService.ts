import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";
import { CityModel } from "../models/CityModel";

export const fetchCityDropDown = async (
  stateIdList : string[],
): Promise<{ value: string; label: string }[]> => {
  const params = stateIdList ? new URLSearchParams({ state_id: stateIdList.toString() }) : "";

  const response = await apiRequest(
    `${ApiPaths.GET_CITY_DROP_DOWN()}${params ? `?${params.toString()}` : ""}`,
    "GET"
  );

  if (response.success) {
    return response.data.records.map((city: any) => ({
      value: city._id,
      label: city.name,
    }));
  } else {
    console.log(response.message ||"Failed to fetch city");
    return [];
  }
};

export const fetchCity = async (
  page: number,
  pageSize: number,
  filters: { name?: string; status?: string }
): Promise<{ response: boolean, cities: CityModel[]; totalPages: number }> => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
    ...(filters.name && { name: filters.name }),
    ...(filters.status && filters.status !== "All" && { is_active: filters.status.toLowerCase() }),
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
    console.log(response.message ||"Failed to fetch city");
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
    console.log(response.message ||"Failed to delete city");
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
