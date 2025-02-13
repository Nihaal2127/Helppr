export const ApiPaths = {
  LOGIN: () => `/auth/login`,
  FORGOT_PASSWORD: () => `/auth/forgotPassword`,
  LOGOUT: () => `/auth/logout`,
  SEND_OTP: () => `/otp/send-otp`,
  VERIFY_OTP: () => `/otp/verify-otp`,
  GET_BY_ID: () => `/user/get`,
  CREATE_ADMIN: '/admin/create',
  UPDATE_ADMIN: (id: string) => `/admin/update/${id}`,
  DELETE_ADMIN: (id: string) => `/admin/delete/${id}`,
  CHANGE_PASSWORD: '/user/changePassword',
};
