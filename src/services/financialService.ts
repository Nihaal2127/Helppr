import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";
import { FinancialModel } from "../models/FinancialModel";
import { showLog } from "../helper/utility";

export const fetchFinancial = async (
  page: number,
  pageSize: number,
  filters: { keyword?: string; status?: string }
): Promise<{ response: boolean, financials: FinancialModel[]; totalPages: number }> => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
    ...(filters.keyword && { name: filters.keyword }),
    ...(filters.status && filters.status !== "All" && { is_active: filters.status.toLowerCase() }),
  });

  const response = await apiRequest(
    `${ApiPaths.GET_FINANCIAL()}?${params.toString()}`,
    "GET"
  );

  if (response.success) {
    return {
      response: true,
      financials: response.data.records,
      totalPages: response.data.totalPages,
    };
  } else {
    showLog(response.message || "Failed to fetch financials");
    return {
      response: false,
      financials: [],
      totalPages: 0,
    };
  }
};
