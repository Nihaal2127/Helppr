import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";

export const createOrUpdateDocument = async (
  data: FormData,
  isEditable: boolean,
): Promise<{ fileList: String[]; response: boolean }> => {
  const path = isEditable ? ApiPaths.UPDATE_DOCUMENT_UPLOAD : ApiPaths.DOCUMENT_UPLOAD;
  const method = isEditable ? "PUT" : "POST";

  const response = await apiRequest(path, method, data, true);
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
