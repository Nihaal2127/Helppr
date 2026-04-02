import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";
import { FinancialModel } from "../models/FinancialModel";
import { OrderModel } from "../models/OrderModel";
import { showLog } from "../helper/utility";
import { fetchOrderById } from "./orderService";

/**
 * `order_service/getAll` rows usually omit populated `user_info` / `partner_info`.
 * Order detail (`/order/get/:id`) includes the same shapes as OrderInfoDialog.
 */
export async function enrichFinancialRowsWithOrderNames(
  rows: FinancialModel[],
  options?: { skipLoader?: boolean }
): Promise<FinancialModel[]> {
  if (!rows.length) return rows;

  const orderIds = Array.from(
    new Set(rows.map((r) => r.order_id).filter((id): id is string => Boolean(id)))
  );

  const orderById = new Map<string, OrderModel>();
  await Promise.all(
    orderIds.map(async (orderId) => {
      const { response, order } = await fetchOrderById(orderId, options);
      if (response && order) {
        orderById.set(orderId, order);
      }
    })
  );

  return rows.map((row) => {
    if (!row.order_id) return row;
    const order = orderById.get(row.order_id);
    if (!order) return row;

    const serviceLine =
      order.service_items?.find((si) => si._id === row._id) ??
      order.service_items?.find(
        (si) =>
          row.service_id &&
          si.service_id === row.service_id &&
          (row.partner_id ? si.partner_id === row.partner_id : true)
      );

    return {
      ...row,
      user_info: order.user_info ?? row.user_info,
      partner_info: serviceLine?.partner_info ?? row.partner_info,
    };
  });
}

export type FinancialListFilters = {
  keyword?: string;
  service_status?: string;
  user_id?: string;
  partner_id?: string;
  is_paid?: string;
  partner_paid_status?: string;
  sort?: string;
  /** Backend may filter rows by consolidated payment state */
  payment_status?: string;
  customer_payment_status?: string;
  partner_payment_status?: string;
  from_date?: string;
  to_date?: string;
  order_id?: string;
};

export const fetchFinancial = async (
  page: number,
  pageSize: number,
  filters: FinancialListFilters,
  requestOpts?: { skipLoader?: boolean }
): Promise<{
  response: boolean;
  financials: FinancialModel[];
  totalPages: number;
  /** From list API `totalItems` (order service / financial list). */
  totalItems?: number;
}> => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
    /* order_service/getAll: align with order list (`keyword`); keep `name` for backends that only read it */
    ...(filters.keyword && { keyword: filters.keyword, name: filters.keyword }),
    ...(filters.service_status && { service_status: filters.service_status }),
    ...(filters.user_id && { user_id: filters.user_id }),
    ...(filters.partner_id && { partner_id: filters.partner_id }),
    ...(filters.is_paid && { is_paid: filters.is_paid.toLowerCase() }),
    ...(filters.partner_paid_status && { partner_paid_status: filters.partner_paid_status }),
    ...(filters.sort && { sort: filters.sort }),
    ...(filters.payment_status && { payment_status: filters.payment_status }),
    ...(filters.customer_payment_status && { customer_payment_status: filters.customer_payment_status }),
    ...(filters.partner_payment_status && { partner_payment_status: filters.partner_payment_status }),
    ...(filters.from_date && { from_date: filters.from_date }),
    ...(filters.to_date && { to_date: filters.to_date }),
    ...(filters.order_id && { order_id: filters.order_id }),
  });

  const response = await apiRequest(
    `${ApiPaths.GET_FINANCIAL()}?${params.toString()}`,
    "GET",
    undefined,
    false,
    requestOpts?.skipLoader ?? false
  );

  if (response.success) {
    const d = response.data ?? {};
    const inner = d.data != null && typeof d.data === "object" && !Array.isArray(d.data) ? d.data : null;
    const records = inner?.records ?? d.records ?? [];
    const totalPagesVal = inner?.totalPages ?? d.totalPages ?? 0;
    const totalItemsRaw = inner?.totalItems ?? d.totalItems;
    const totalItemsParsed =
      totalItemsRaw === undefined || totalItemsRaw === null || totalItemsRaw === ""
        ? undefined
        : Number(totalItemsRaw);
    const totalItems =
      totalItemsParsed !== undefined && !Number.isNaN(totalItemsParsed) ? totalItemsParsed : undefined;

    return {
      response: true,
      financials: records,
      totalPages: totalPagesVal,
      totalItems,
    };
  } else {
    showLog(response.message || "Failed to fetch financials");
    return {
      response: false,
      financials: [],
      totalPages: 0,
      totalItems: undefined,
    };
  }
};

/** Loads every page for the given filters (same as the table). Optionally skips per-order enrichment (faster for bulk pending lists). */
export async function fetchAllFinancialRowsMatching(
  filters: FinancialListFilters,
  batchSize = 250,
  opts?: { skipEnrich?: boolean }
): Promise<FinancialModel[] | null> {
  const first = await fetchFinancial(1, batchSize, filters, { skipLoader: true });
  if (!first.response) return null;
  let all = [...first.financials];
  const totalPages = Math.max(1, first.totalPages);
  for (let p = 2; p <= totalPages; p++) {
    const next = await fetchFinancial(p, batchSize, filters, { skipLoader: true });
    if (!next.response) break;
    all = all.concat(next.financials);
  }
  if (opts?.skipEnrich) {
    return all;
  }
  return enrichFinancialRowsWithOrderNames(all, { skipLoader: true });
}
