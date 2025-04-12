import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";
import { FinancialModel } from "../models/FinancialModel";
import { showLog } from "../helper/utility";

export const fetchFinancial = async (
  page: number,
  pageSize: number,
  filters: {
    keyword?: string;
    service_status?: string;
    user_id?: string;
    partner_id?: string;
    is_paid?: string;
    partner_paid_status? : string;
  }
): Promise<{ response: boolean, financials: FinancialModel[]; totalPages: number }> => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
    ...(filters.keyword && { name: filters.keyword }),
    ...(filters.service_status && { service_status: filters.service_status}),
    ...(filters.user_id && { user_id: filters.user_id}),
    ...(filters.partner_id && { partner_id: filters.partner_id}),
    ...(filters.is_paid && { is_paid: filters.is_paid.toLowerCase()}),
    ...(filters.partner_paid_status && { partner_paid_status: filters.partner_paid_status}),
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
