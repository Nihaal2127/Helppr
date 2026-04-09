import { UserModel } from "../models/UserModel";
import { showLog } from "../helper/utility";

/**
 * Toggle mock auth.
 * - true: login should work ONLY with the mock credentials below (no real login API)
 * - false: real admin login API should work (franchise/employee can still use mock logins)
 */
export const mock_auth_login = false;

export const MOCK_ADMIN_CREDENTIALS = {
  email: "admin@helper.com",
  password: "admin123",
} as const;

export const MOCK_FRANCHISE_CREDENTIALS = {
  email: "franchise@helper.mock",
  password: "franchise123",
} as const;

export const MOCK_EMPLOYEE_CREDENTIALS = {
  email: "employee@helper.mock",
  password: "employee123",
} as const;

const MOCK_DELAY_MS = 350;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function baseMockUser(overrides: Partial<UserModel>): UserModel {
  return {
    _id: "mock-id",
    name: null,
    email: null,
    phone_number: null,
    address: null,
    landmark: null,
    state_id: null,
    city_id: null,
    state_name: null,
    city_name: null,
    pincode: null,
    profile_url: null,
    user_id: null,
    registration_id: null,
    is_from_web: true,
    is_active: true,
    is_business: false,
    type: 1,
    registration_type: null,
    device_token: null,
    platform_type: 1,
    business_info_id: null,
    auth_token: null,
    created_by_id: null,
    last_signin: null,
    password: null,
    current_password: null,
    new_password: null,
    confirm_password: null,
    deleted_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    total_amount: 0,
    total_payment: 0,
    paid_amount: 0,
    balance_amount: null,
    received_payment: 0,
    in_progress_payment: 0,
    refund_payment: 0,
    payment_mode: null,
    last_paid_date: null,
    last_service_date: null,
    total_service: 0,
    service_paid: 0,
    service_unpaid: 0,
    in_progress_service: 0,
    completed_service: 0,
    cancelled_service: 0,
    my_services: [],
    bank_account: null,
    documents: [],
    ...overrides,
  };
}

/**
 * Mock login for Admin — does not call the real API.
 */
export const mockAdminLogin = async (payload: {
  email: string;
  password: string;
  device_token?: string | null;
}): Promise<{ admin: UserModel | null; response: boolean }> => {
  try {
    await delay(MOCK_DELAY_MS);
    const pwd = (payload.password ?? "").trim();
    const ok =
      payload.email.trim().toLowerCase() ===
        MOCK_ADMIN_CREDENTIALS.email.toLowerCase() &&
      pwd === MOCK_ADMIN_CREDENTIALS.password;
    if (!ok) {
      showLog("Mock admin login failed: invalid credentials");
      return { admin: null, response: false };
    }
    const admin = baseMockUser({
      _id: "mock-admin-001",
      name: "Admin (Mock)",
      email: MOCK_ADMIN_CREDENTIALS.email,
      auth_token: "mock-admin-token",
      type: 1,
      created_by_id: "mock-admin-001",
      device_token: payload.device_token ?? null,
    });
    return { admin, response: true };
  } catch (error) {
    showLog("Error during mock admin login:", error);
    return { admin: null, response: false };
  }
};

/**
 * Mock login for Franchise admin — does not call the real API.
 */
export const mockFranchiseAdminLogin = async (payload: {
  email: string;
  password: string;
  device_token?: string | null;
}): Promise<{ admin: UserModel | null; response: boolean }> => {
  try {
    await delay(MOCK_DELAY_MS);
    const pwd = (payload.password ?? "").trim();
    const ok =
      payload.email.trim().toLowerCase() ===
        MOCK_FRANCHISE_CREDENTIALS.email.toLowerCase() &&
      pwd === MOCK_FRANCHISE_CREDENTIALS.password;
    if (!ok) {
      showLog("Mock franchise admin login failed: invalid credentials");
      return { admin: null, response: false };
    }
    const admin = baseMockUser({
      _id: "mock-franchise-admin-001",
      name: "Franchise Admin (Mock)",
      email: MOCK_FRANCHISE_CREDENTIALS.email,
      auth_token: "mock-franchise-admin-token",
      type: 2,
      created_by_id: "mock-franchise-admin-001",
      device_token: payload.device_token ?? null,
    });
    return { admin, response: true };
  } catch (error) {
    showLog("Error during mock franchise admin login:", error);
    return { admin: null, response: false };
  }
};

/**
 * Mock login for Employee — does not call the real API.
 */
export const mockEmployeeLogin = async (payload: {
  email: string;
  password: string;
  device_token?: string | null;
}): Promise<{ admin: UserModel | null; response: boolean }> => {
  try {
    await delay(MOCK_DELAY_MS);
    const pwd = (payload.password ?? "").trim();
    const ok =
      payload.email.trim().toLowerCase() ===
        MOCK_EMPLOYEE_CREDENTIALS.email.toLowerCase() &&
      pwd === MOCK_EMPLOYEE_CREDENTIALS.password;
    if (!ok) {
      showLog("Mock employee login failed: invalid credentials");
      return { admin: null, response: false };
    }
    const admin = baseMockUser({
      _id: "mock-employee-001",
      name: "Employee (Mock)",
      email: MOCK_EMPLOYEE_CREDENTIALS.email,
      auth_token: "mock-employee-token",
      type: 3,
      created_by_id: "mock-employee-001",
      device_token: payload.device_token ?? null,
    });
    return { admin, response: true };
  } catch (error) {
    showLog("Error during mock employee login:", error);
    return { admin: null, response: false };
  }
};
