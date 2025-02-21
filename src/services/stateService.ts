import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";
import { StateModel } from "../models/StateModel";

export const fetchStateDropDown =async (
): Promise<{ value: string; label: string }[]> => {
    const response = await apiRequest(
      `${ApiPaths.GET_STATE_DROP_DOWN()}`,
      "GET"
    );

    if (response.success) {
      return response.data.records.map((state: any) => ({
        value: state._id,
        label: state.name,
      }));
    } else {
      console.log(response.message ||"Failed to fetch state");
      return [];
    }
};

export const fetchState = async (
  page: number,
  pageSize: number,
  filters: { name?: string; status?: string }
): Promise<{ response: boolean, states: StateModel[]; totalPages: number }> => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
    ...(filters.name && { name: filters.name }),
    ...(filters.status && filters.status !== "All" && { is_active: filters.status.toLowerCase() }),
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
    console.log(response.message ||"Failed to fetch state");
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
    console.log(response.message ||"Failed to delete state");
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
