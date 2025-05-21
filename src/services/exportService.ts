import { apiRequestBlob } from "../remote/apiHelper";

export const exportData = async (path: string, payload?: any) => {
  const response = await apiRequestBlob(path);
  if (response.success) {
    return true;
  }
  return false;
};