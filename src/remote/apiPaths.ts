export const ApiPaths = {
  LOGIN: () => `/auth/login`,
  FORGOT_PASSWORD: () => `/auth/forgotPassword`,
  LOGOUT: () => `/auth/logout`,
  SEND_OTP: () => `/otp/send-otp`,
  VERIFY_OTP: () => `/otp/verify-otp`,
  GET_BY_ID: () => `/user/get`,
  CREATE_USER: '/user/create',
  UPDATE_USER: (id: string) => `/user/update/${id}`,
  DELETE_USER: (id: string) => `/user/delete/${id}`,
  CHANGE_PASSWORD: '/user/changePassword',
  DOCUMENT_UPLOAD: '/document_upload/files',
  UPDATE_DOCUMENT_UPLOAD: '/document_upload/update_files',
};
