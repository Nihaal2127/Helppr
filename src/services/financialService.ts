import { apiRequest } from "../lib/global/remote/apiHelper";
import { ApiPaths } from "../lib/global/remote/apiPaths";
import { FinancialModel } from "../lib/models/FinancialModel";
import { showLog } from "../helper/utility";
import type { ServerTableSortBy } from "../lib/global/serverTableSort";
import { sessionMayUseFranchiseIdApiFilter } from "../lib/franchise/headerFranchisePreference";

export type FinancialListFilters = {
  /** Table search — sent as `search` query param. */
  search?: string;
  /** @deprecated use `search` */
  keyword?: string;
  /** `completed` | `in_progress` */
  order_status?: string;
  /** Legacy order_service filter only */
  service_status?: string;
  user_id?: string;
  partner_id?: string;
  is_paid?: string;
  partner_paid_status?: string;
  sort?: string;
  payment_status?: string;
  customer_payment_status?: string;
  partner_payment_status?: string;
  from_date?: string;
  to_date?: string;
  order_id?: string;
  franchise_id?: string | null;
};

function parseListPayload(response: {
  success?: boolean;
  data?: Record<string, unknown>;
  message?: string;
}): {
  response: boolean;
  financials: FinancialModel[];
  totalPages: number;
  totalItems?: number;
} {
  if (!response.success) {
    showLog(response.message || "Failed to fetch financials");
    return {
      response: false,
      financials: [],
      totalPages: 0,
      totalItems: undefined,
    };
  }

  const d = response.data ?? {};
  const inner =
    d.data != null && typeof d.data === "object" && !Array.isArray(d.data)
      ? (d.data as Record<string, unknown>)
      : null;
  const records = (inner?.records ?? d.records ?? []) as FinancialModel[];
  const totalPagesVal = Number(inner?.totalPages ?? d.totalPages ?? 0);
  const totalItemsRaw = inner?.totalItems ?? d.totalItems;
  const totalItemsParsed =
    totalItemsRaw === undefined ||
    totalItemsRaw === null ||
    totalItemsRaw === ""
      ? undefined
      : Number(totalItemsRaw);
  const totalItems =
    totalItemsParsed !== undefined && !Number.isNaN(totalItemsParsed)
      ? totalItemsParsed
      : undefined;

  return {
    response: true,
    financials: records,
    totalPages: totalPagesVal,
    totalItems,
  };
}

function buildFinancialQueryParams(
  page: number,
  pageSize: number,
  filters: FinancialListFilters,
  sortBy: ServerTableSortBy,
  opts?: { includeOrderServiceFields?: boolean }
): URLSearchParams {
  const primarySort = sortBy[0];
  const fidRaw = String(filters.franchise_id ?? "").trim();
  const franchiseId =
    fidRaw && fidRaw.toLowerCase() !== "all" && sessionMayUseFranchiseIdApiFilter()
      ? fidRaw
      : "";

  const searchText = (filters.search ?? filters.keyword)?.trim();

  const params = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
    ...(searchText && { search: searchText }),
    ...(filters.order_status && { order_status: filters.order_status }),
    ...(opts?.includeOrderServiceFields &&
      filters.service_status && { service_status: filters.service_status }),
    ...(opts?.includeOrderServiceFields &&
      filters.user_id && { user_id: filters.user_id }),
    ...(opts?.includeOrderServiceFields &&
      filters.partner_id && { partner_id: filters.partner_id }),
    ...(opts?.includeOrderServiceFields &&
      filters.is_paid && { is_paid: filters.is_paid.toLowerCase() }),
    ...(opts?.includeOrderServiceFields &&
      filters.partner_paid_status && {
        partner_paid_status: filters.partner_paid_status,
      }),
    ...(filters.sort && { sort: filters.sort }),
    ...(primarySort?.id && { sort_by: primarySort.id }),
    ...(primarySort && { sort_order: primarySort.desc ? "desc" : "asc" }),
    ...(filters.payment_status && { payment_status: filters.payment_status }),
    ...(filters.customer_payment_status && {
      customer_payment_status: filters.customer_payment_status,
    }),
    ...(filters.partner_payment_status && {
      partner_payment_status: filters.partner_payment_status,
    }),
    ...(filters.from_date && { from_date: filters.from_date }),
    ...(filters.to_date && { to_date: filters.to_date }),
    ...(filters.order_id && { order_id: filters.order_id }),
    ...(franchiseId ? { franchise_id: franchiseId } : {}),
  });

  return params;
}

/** `GET /financial-order/getAll` — Financial → Order Payments (Postman Financial orders). */
export const fetchFinancial = async (
  page: number,
  pageSize: number,
  filters: FinancialListFilters,
  requestOpts?: { skipLoader?: boolean },
  sortBy: ServerTableSortBy = []
): Promise<{
  response: boolean;
  financials: FinancialModel[];
  totalPages: number;
  totalItems?: number;
}> => {
  const params = buildFinancialQueryParams(page, pageSize, filters, sortBy, {
    includeOrderServiceFields: false,
  });

  const response = await apiRequest(
    `${ApiPaths.FINANCIAL_ORDER_GET_ALL()}?${params.toString()}`,
    "GET",
    undefined,
    false,
    requestOpts?.skipLoader ?? false
  );

  return parseListPayload(response);
};

/** `GET /financial-order/get/:id` */
export const fetchFinancialOrderById = async (
  id: string,
  requestOpts?: { skipLoader?: boolean }
): Promise<{ response: boolean; record: FinancialModel | null }> => {
  const response = await apiRequest(
    ApiPaths.FINANCIAL_ORDER_GET_BY_ID(id),
    "GET",
    undefined,
    false,
    requestOpts?.skipLoader ?? true
  );
  if (!response.success) {
    return { response: false, record: null };
  }
  const d = response.data ?? {};
  const inner =
    d.data != null && typeof d.data === "object" && !Array.isArray(d.data)
      ? d.data
      : d;
  const record =
    (inner as { record?: FinancialModel }).record ??
    (inner as FinancialModel);
  return { response: true, record: record ?? null };
};

/** `GET /order_service/getAll` — Partner Payments page & payout pending lines. */
export const fetchOrderServiceFinancial = async (
  page: number,
  pageSize: number,
  filters: FinancialListFilters,
  requestOpts?: { skipLoader?: boolean },
  sortBy: ServerTableSortBy = []
): Promise<{
  response: boolean;
  financials: FinancialModel[];
  totalPages: number;
  totalItems?: number;
}> => {
  const params = buildFinancialQueryParams(page, pageSize, filters, sortBy, {
    includeOrderServiceFields: true,
  });

  const response = await apiRequest(
    `${ApiPaths.GET_ORDER_SERVICE_ALL()}?${params.toString()}`,
    "GET",
    undefined,
    false,
    requestOpts?.skipLoader ?? false
  );

  return parseListPayload(response);
};

/** Paginated financial-order rows (all pages). */
export async function fetchAllFinancialRowsMatching(
  filters: FinancialListFilters,
  batchSize = 250,
  opts?: { sortBy?: ServerTableSortBy }
): Promise<FinancialModel[] | null> {
  const first = await fetchFinancial(
    1,
    batchSize,
    filters,
    { skipLoader: true },
    opts?.sortBy ?? []
  );
  if (!first.response) return null;
  let all = [...first.financials];
  const totalPages = Math.max(1, first.totalPages);
  for (let p = 2; p <= totalPages; p++) {
    const next = await fetchFinancial(
      p,
      batchSize,
      filters,
      { skipLoader: true },
      opts?.sortBy ?? []
    );
    if (!next.response) break;
    all = all.concat(next.financials);
  }
  return all;
}

/** Paginated order_service rows (partner payout ledger credits). */
export async function fetchAllOrderServiceRowsMatching(
  filters: FinancialListFilters,
  batchSize = 250,
  opts?: { sortBy?: ServerTableSortBy }
): Promise<FinancialModel[] | null> {
  const first = await fetchOrderServiceFinancial(
    1,
    batchSize,
    filters,
    { skipLoader: true },
    opts?.sortBy ?? []
  );
  if (!first.response) return null;
  let all = [...first.financials];
  const totalPages = Math.max(1, first.totalPages);
  for (let p = 2; p <= totalPages; p++) {
    const next = await fetchOrderServiceFinancial(
      p,
      batchSize,
      filters,
      { skipLoader: true },
      opts?.sortBy ?? []
    );
    if (!next.response) break;
    all = all.concat(next.financials);
  }
  return all;
}
