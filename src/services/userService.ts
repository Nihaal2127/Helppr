import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";
import { UserModel } from "../models/UserModel";
import { showLog } from "../helper/utility";

export const fetchUserDropDown = async (type: number, serviceId?: string
): Promise<{ users: UserModel[]; }> => {
  const params = new URLSearchParams({
    type: String(type),
    ...(serviceId && { service_id: serviceId }),
  });
  const response = await apiRequest(
    `${ApiPaths.GET_USER_DROP_DOWN()}?${params.toString()}`,
    "GET"
  );

  if (response.success) {
    return {
      users: response.data.records,
    };
  } else {
    showLog(response.message || "Failed to fetch user");
    return { users: [] };
  }
};

export const fetchPartnerDropDown = async (serviceId?: string
): Promise<{ partners: UserModel[]; }> => {
  const params = new URLSearchParams({
    ...(serviceId && { service_id: serviceId }),
  });
  const response = await apiRequest(
    `${ApiPaths.GET_PARTNER_DROP_DOWN()}?${params.toString()}`,
    "GET"
  );

  if (response.success) {
    return {
      partners: response.data.records,
    };
  } else {
    showLog(response.message || "Failed to fetch partner");
    return { partners: [] };
  }
};

export type UserListFilters = {
  keyword?: string;
  status?: string;
  sort?: string;
  /** e.g. pending | cleared — sent when backend supports partner wallet filtering */
  wallet_status?: string;
  from_date?: string;
  to_date?: string;
};

export const fetchUser = async (
  isVerification: boolean,
  type: number,
  page: number,
  pageSize: number,
  filters: UserListFilters
): Promise<{ response: boolean, users: UserModel[]; totalPages: number }> => {
  const params = new URLSearchParams({
    type: String(type),
    page: String(page),
    limit: String(pageSize),
    ...(filters.keyword && { name: filters.keyword }),
    ...(filters.status && filters.status !== "All" && { is_active: filters.status.toLowerCase() }),
    ...(filters.sort && { sort: filters.sort }),
    ...(filters.wallet_status && filters.wallet_status !== "all" && { wallet_status: filters.wallet_status }),
    ...(filters.from_date && { from_date: filters.from_date }),
    ...(filters.to_date && { to_date: filters.to_date }),
  });

  const response = await apiRequest(
    `${isVerification ? ApiPaths.GET_VERIFICATION() : ApiPaths.GET_USER()}?${params.toString()}`,
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
