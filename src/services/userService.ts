import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";
import { UserModel } from "../models/UserModel";
import { showLog } from "../helper/utility";

export const fetchUserDropDown = async (
): Promise<{ value: string; label: string }[]> => {
  const response = await apiRequest(
    `${ApiPaths.GET_USER_DROP_DOWN()}`,
    "GET"
  );

  if (response.success) {
    return response.data.records.map((user: any) => ({
      value: user._id,
      label: user.name,
    }));
  } else {
    showLog(response.message || "Failed to fetch user");
    return [];
  }
};

export const fetchUser = async (
  type: number,
  page: number,
  pageSize: number,
  filters: { keyword?: string; status?: string }
): Promise<{ response: boolean, users: UserModel[]; totalPages: number }> => {
  const params = new URLSearchParams({
    type: String(type),
    page: String(page),
    limit: String(pageSize),
    ...(filters.keyword && { name: filters.keyword }),
    ...(filters.status && filters.status !== "All" && { is_active: filters.status.toLowerCase() }),
  });

  const response = await apiRequest(
    `${ApiPaths.GET_USER()}?${params.toString()}`,
    "GET"
  );

  if (response.success) {
    return {
      response: true,
      users: response.data.records,
      totalPages: response.data.totalPages,
    };
  } else {
    showLog(response.message || "Failed to fetch users");
    return {
      response: false,
      users: [],
      totalPages: 0,
    };
  }
};

export const fetchUserById = async (id: string): Promise<{ response: boolean, user: UserModel | null; }> => {
  const response = await apiRequest(`${ApiPaths.GET_USER_BY_ID()}/${id}`, "GET");
  if (response.success) {
    return {
      response: true,
      user: response.data.record,
    };
  } else {
    return {
      response: false,
      user: null,
    };
  }
};

export const deleteUser = async (id: string): Promise<boolean> => {
  const response = await apiRequest(ApiPaths.DELETE_USER(id), "DELETE");
  if (response.success) {
    return true;
  } else {
    showLog(response.message || "Failed to delete users");
    return false;
  }
};

export const createOrUpdateUser = async (
  payload: any,
  isEditable: boolean,
  id?: string
): Promise<boolean> => {
  const path = isEditable ? ApiPaths.UPDATE_USER(id!) : ApiPaths.CREATE_USER;
  const method = isEditable ? "PUT" : "POST";

  const response = await apiRequest(path, method, payload);
  if (response.success) {
    return true;
  }
  return false;
};
