import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";

export const updatePartnerDocument = async (
  payload: any,
  id: string
): Promise<{ fileList: String[]; response: boolean }> => {
  const response = await apiRequest(ApiPaths.UPDATE_PARTNER_DOCUMENT(id), "PUT", payload);
  if (response.success) {
    return {
      fileList: response.data.records,
      response: true,
    };
  } else {
    console.log("Document fail:", response.message || "Unknown error");
    return {
      fileList: [],
      response: false,
    };
  }
};
