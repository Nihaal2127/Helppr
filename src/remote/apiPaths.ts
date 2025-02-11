export const ApiPaths = {
  LOGIN: () => `/admin/login`,
  FORGOT_PASSWORD: () => `/admin/login`,
  LOGOUT: () => `/admin/logout`,
  SEND_OTP: () => `/otp/send-otp`,
  VERIFY_OTP: () => `/otp/verify-otp`,
  GET_ADMIN_BY_ID: () => `/admin/get`,
  CREATE_ADMIN: '/admin/create',
  UPDATE_ADMIN: (id: string) => `/admin/update/${id}`,
  DELETE_ADMIN: (id: string) => `/admin/delete/${id}`,
};
