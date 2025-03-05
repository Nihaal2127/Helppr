import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";
import { showLog } from "../helper/utility";
import { DocumentModel } from "../models/DocumentModel";

export const fetchPartnerDocuments = async (
  page: number,
  pageSize: number,
  filters: { keyword?: string; status?: string }
): Promise<{ response: boolean, partnerDocuments: DocumentModel[]; totalPages: number }> => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
    ...(filters.keyword && { name: filters.keyword }),
    ...(filters.status && filters.status !== "All" && { is_active: filters.status.toLowerCase() }),
  });

  const response = await apiRequest(
    `${ApiPaths.GET_PARTNER_DOCUMENT()}?${params.toString()}`,
    "GET"
  );

  if (response.success) {
    return {
      response: true,
      partnerDocuments: response.data.records,
      totalPages: response.data.totalPages,
    };
  } else {
    showLog(response.message || "Failed to fetch partner document");
    return {
      response: false,
      partnerDocuments: [],
      totalPages: 0,
    };
  }
};

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
    showLog("Document fail:", response.message || "Unknown error");
    return {
      fileList: [],
      response: false,
    };
  }
};

export const deletePartnerDocument = async (id: string): Promise<boolean> => {
  const response = await apiRequest(ApiPaths.DELETE_PARTNER_DOCUMENT(id), "DELETE");
  if (response.success) {
    return true;
  } else {
    showLog(response.message || "Failed to delete partner document");
    return false;
  }
};
