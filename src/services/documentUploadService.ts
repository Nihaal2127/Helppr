import { VerificationModel } from "../models/VerificationModel";
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

export const fetchVerification = async (
  page: number,
  pageSize: number,
  filters: { name?: string; status?: string }
): Promise<{ response: boolean, verifications: VerificationModel[]; totalPages: number }> => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
    ...(filters.name && { name: filters.name }),
    ...(filters.status && filters.status !== "All" && { is_active: filters.status.toLowerCase() }),
  });

  const response = await apiRequest(
    `${ApiPaths.GET_VERIFICATION}?${params.toString()}`,
    "GET"
  );

  if (response.success) {
    return {
      response: true,
      verifications: response.data.records,
      totalPages: response.data.totalPages,
    };
  } else {
    console.log(response.message ||"Failed to fetch verifications");
    return {
      response: false,
      verifications: [],
      totalPages: 0,
    };
  }
};