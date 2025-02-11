import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";
import { AdminModel } from "../models/AdminModel";

export const login = async (
  payload: any
): Promise<{ admin: AdminModel | null; response: boolean }> => {
  try {
    const response = await apiRequest(ApiPaths.LOGIN(), "POST", payload);
    if (response.success) {
      return {
        admin: response.data.record,
        response: true,
      };
    } else {
      console.log("Admin login failed:", response.message || "Unknown error");
      return {
        admin: null,
        response: false,
      };
    }
  } catch (error) {
    console.log("Error during admin login:", error);
    return {
      admin: null,
      response: false,
    };
  }
};

export const forgotPassword = async (
  payload: any
): Promise<boolean> => {
  try {
    const response = await apiRequest(ApiPaths.FORGOT_PASSWORD(), "POST", payload);
    if (response.success) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.log("Error during forgot password:", error);
    return false;
  }
};

export const logout = async (): Promise<Boolean> => {
  try {
    const response = await apiRequest(ApiPaths.LOGOUT(), "POST");
    if (response.success) {
      return true;
    } else {
      console.log("Admin logout failed:", response.message || "Unknown error");
      return false;
    }
  } catch (error) {
    console.log("Error during admin logout:", error);
    return false;
  }
};

export const fetchAdminById = async (id: string) : Promise<AdminModel | null> => {
  try {
    const response = await apiRequest(`${ApiPaths.GET_ADMIN_BY_ID()}/${id}`, "GET");
    if (response.success) {
      return response.data.record;
    } else {
      console.log("Failed to fetch admin:", response.message || "Unknown error");
      return null;
    }
  } catch (error) {
    console.log("Error during admin login:", error);
    return null;
  }
};

export const deleteAdmin = async (id: string): Promise<boolean> => {
  const response = await apiRequest(ApiPaths.DELETE_ADMIN(id), "DELETE");
  if (response.success) {
    return true;
  } else {
    return false;
  }
};

export const createOrUpdateAdmin = async (
  payload: any,
  isEditable: boolean,
  id?: string
): Promise<boolean> => {
  const path = isEditable ? ApiPaths.UPDATE_ADMIN(id!) : ApiPaths.CREATE_ADMIN;
  const method = isEditable ? "PUT" : "POST";

  const response = await apiRequest(path, method, payload);
  if (response.success) {
    return true;
  }
  return false;
};
