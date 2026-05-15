import { apiRequest } from "../lib/global/remote/apiHelper";
import { ApiPaths } from "../lib/global/remote/apiPaths";
import { OrderModel } from "../lib/order/OrderModel";
import { showLog } from "../helper/utility";
import type { ServerTableSortBy } from "../lib/global/serverTableSort";
import { sessionMayUseFranchiseIdApiFilter } from "../lib/franchise/headerFranchisePreference";

/** Order list tabs — `order_status` 2–5 (see `OrderStatusEnum`). */
export const ORDER_TAB_KEYS = [2, 3, 4, 5] as const;
export type OrderTabKey = (typeof ORDER_TAB_KEYS)[number];

export type OrderListFilters = {
  keyword?: string;
  status?: string;
  sort?: string;
  from_date?: string | null;
  to_date?: string | null;
  franchise_id?: string | null;
};

function str(v: unknown): string {
  if (v == null) return "";
  const s = String(v).trim();
  return s === "undefined" || s === "null" ? "" : s;
}

function nestedObj(v: unknown): Record<string, unknown> | undefined {
  if (v == null || typeof v !== "object" || Array.isArray(v)) return undefined;
  return v as Record<string, unknown>;
}

function refId(v: unknown): string {
  if (typeof v === "string" || typeof v === "number") return str(v);
  const o = nestedObj(v);
  return o ? str(o._id ?? o.id) : "";
}

function extractPagedRecords(data: unknown): {
  records: unknown[];
  totalPages: number;
  totalCount: number;
} {
  const d = (data ?? {}) as Record<string, unknown>;
  const inner =
    d.data != null && typeof d.data === "object" && !Array.isArray(d.data)
      ? (d.data as Record<string, unknown>)
      : d;
  const records = Array.isArray(inner.records)
    ? inner.records
    : Array.isArray(d.records)
      ? d.records
      : [];
  const totalPages = Number(inner.totalPages ?? d.totalPages ?? 0) || 0;
  const rawTotal =
    inner.totalItems ??
    inner.total_count ??
    inner.totalCount ??
    inner.total ??
    inner.count ??
    inner.recordsTotal ??
    inner.total_records ??
    d.totalItems ??
    d.totalCount ??
    d.total ??
    d.recordsTotal ??
    d.count;
  let totalCount = Number(rawTotal);
  if (!Number.isFinite(totalCount) || totalCount < 0) totalCount = 0;
  return { records, totalPages, totalCount };
}

function extractOrderRecord(data: unknown): OrderModel | null {
  const d = (data ?? {}) as Record<string, unknown>;
  const inner =
    d.data != null && typeof d.data === "object" && !Array.isArray(d.data)
      ? (d.data as Record<string, unknown>)
      : null;
  const raw =
    d.record ??
    inner?.record ??
    (d._id || d.unique_id ? d : null) ??
    (inner && (inner._id || inner.unique_id) ? inner : null);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return mapServerOrderRecord(raw as Record<string, unknown>);
}

/** Normalizes list/detail rows from `GET /order/getAll` and `GET /order/get/:id`. */
export function mapServerOrderRecord(r: Record<string, unknown>): OrderModel {
  const userRef = nestedObj(r.user_id) ?? nestedObj(r.user);
  const userInfo =
    nestedObj(r.user_info) ??
    (userRef
      ? {
          ...userRef,
          name: userRef.name ?? userRef.user_name,
        }
      : undefined);

  const orderStatusRaw = r.order_status ?? r.status_code ?? r.status;
  const order_status = Number(orderStatusRaw);
  const user_name =
    str(r.user_name) ||
    str(userInfo?.name) ||
    str(userInfo?.user_name) ||
    "";

  return {
    ...(r as unknown as OrderModel),
    _id: str(r._id) || str(r.id),
    user_id: refId(r.user_id) || refId(userRef) || str(r.user_id),
    user_name,
    user_info:
      (userInfo as unknown as OrderModel["user_info"]) ??
      (r.user_info as OrderModel["user_info"]),
    order_status: Number.isFinite(order_status) ? order_status : Number(r.order_status) || 0,
    unique_id: str(r.unique_id) || str(r.order_unique_id) || null,
    service_items: Array.isArray(r.service_items)
      ? (r.service_items as OrderModel["service_items"])
      : [],
  };
}

/**
 * Maps `POST /getCount` `type: order-management` `record` into tab totals (status 2–5).
 */
export function mapOrderTabCountsFromRecord(
  record: Record<string, unknown> | null | undefined
): Partial<Record<OrderTabKey, number>> | null {
  if (!record || typeof record !== "object") return null;
  const byLower = new Map(
    Object.entries(record).map(([k, v]) => [k.toLowerCase(), v])
  );
  const pick = (...aliases: string[]): number | null => {
    for (const a of aliases) {
      const v = byLower.get(a.toLowerCase());
      if (v !== undefined && v !== null) {
        const n = Number(v);
        if (Number.isFinite(n)) return n;
      }
    }
    return null;
  };
  const out: Partial<Record<OrderTabKey, number>> = {};
  const assign = (key: OrderTabKey, ...aliases: string[]) => {
    const n = pick(...aliases);
    if (n !== null) out[key] = n;
  };
  assign(
    2,
    "order_in_progress",
    "in_progress",
    "orders_in_progress",
    "order_status_2",
    "status_2",
    "total_order_in_progress"
  );
  assign(
    3,
    "order_completed",
    "completed",
    "orders_completed",
    "order_status_3",
    "status_3",
    "total_order_completed"
  );
  assign(
    4,
    "order_cancelled",
    "cancelled",
    "orders_cancelled",
    "order_status_4",
    "status_4",
    "total_order_cancelled"
  );
  assign(
    5,
    "order_refunded",
    "refunded",
    "orders_refunded",
    "order_status_5",
    "status_5",
    "total_order_refunded"
  );
  if (Object.keys(out).length === 0) return null;
  for (const k of ORDER_TAB_KEYS) {
    if (out[k] === undefined) out[k] = 0;
  }
  return out;
}

function resolveFranchiseIdForQuery(
  franchiseId?: string | null
): string {
  const fidRaw = str(franchiseId);
  if (!fidRaw || fidRaw.toLowerCase() === "all") return "";
  return sessionMayUseFranchiseIdApiFilter() ? fidRaw : fidRaw;
}

/**
 * Paginated order list — `GET /order/getAll` (Help-PR Postman → Order).
 */
export const fetchOrder = async (
  page: number,
  pageSize: number,
  filters: OrderListFilters,
  sortBy: ServerTableSortBy = []
): Promise<{
  response: boolean;
  orders: OrderModel[];
  totalPages: number;
  totalCount: number;
}> => {
  const primarySort = sortBy[0];
  const kw = filters.keyword?.trim();
  const status =
    filters.status && filters.status !== "All"
      ? filters.status.toLowerCase()
      : "";
  const fid = resolveFranchiseIdForQuery(filters.franchise_id);

  const params = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
    ...(kw && { keyword: kw, search: kw }),
    ...(status && { order_status: status }),
    ...(filters.sort && { sort: filters.sort }),
    ...(filters.from_date && { from_date: filters.from_date }),
    ...(filters.to_date && { to_date: filters.to_date }),
    ...(primarySort?.id && { sort_by: primarySort.id }),
    ...(primarySort && { sort_order: primarySort.desc ? "desc" : "asc" }),
    ...(fid ? { franchise_id: fid } : {}),
  });

  if (!primarySort?.id) {
    params.set("sort_by", "created_at");
    params.set("sort_order", "desc");
  }

  const response = await apiRequest(
    `${ApiPaths.GET_ORDER()}?${params.toString()}`,
    "GET"
  );

  if (!response.success) {
    showLog(response.message || "Failed to fetch orders");
    return { response: false, orders: [], totalPages: 0, totalCount: 0 };
  }

  const { records, totalPages, totalCount: tc } = extractPagedRecords(
    response.data
  );
  let totalCount = tc;
  const orders = records.map((row) =>
    mapServerOrderRecord(row as Record<string, unknown>)
  );

  if (!Number.isFinite(totalCount) || totalCount < 0) {
    totalCount =
      totalPages > 0
        ? Math.max(0, (totalPages - 1) * pageSize + orders.length)
        : orders.length;
  }

  return { response: true, orders, totalPages, totalCount };
};

/** `GET /order/get/:id` */
export const fetchOrderById = async (
  id: string,
  options?: { skipLoader?: boolean }
): Promise<{ response: boolean; order: OrderModel | null }> => {
  const response = await apiRequest(
    `${ApiPaths.GET_ORDER_BY_ID()}/${id}`,
    "GET",
    undefined,
    false,
    options?.skipLoader ?? false
  );
  if (response.success) {
    const order = extractOrderRecord(response.data);
    return { response: Boolean(order), order };
  }
  return { response: false, order: null };
};

/** `GET /order/getCustomerOrder` — optional `user_id` query. */
export const fetchCustomerOrders = async (
  userId?: string
): Promise<{ response: boolean; orders: OrderModel[] }> => {
  const params = new URLSearchParams();
  const uid = str(userId);
  if (uid) params.set("user_id", uid);

  const qs = params.toString();
  const path = qs
    ? `${ApiPaths.GET_CUSTOMER_ORDERS}?${qs}`
    : ApiPaths.GET_CUSTOMER_ORDERS;

  const response = await apiRequest(path, "GET", undefined, false, true);
  if (!response.success) {
    showLog(response.message || "Failed to fetch customer orders");
    return { response: false, orders: [] };
  }

  const d = response.data ?? {};
  const list = Array.isArray(d.records)
    ? d.records
    : Array.isArray(d)
      ? d
      : Array.isArray((d as { data?: unknown }).data)
        ? ((d as { data: unknown[] }).data as unknown[])
        : [];

  return {
    response: true,
    orders: list.map((row: unknown) =>
      mapServerOrderRecord(row as Record<string, unknown>)
    ),
  };
};

export const deleteOrder = async (id: string): Promise<boolean> => {
  const response = await apiRequest(ApiPaths.DELETE_ORDER(id), "DELETE");
  if (response.success) return true;
  showLog(response.message || "Failed to delete order");
  return false;
};

export const createOrUpdateOrder = async (
  payload: Record<string, unknown>,
  isEditable: boolean,
  id?: string
): Promise<boolean> => {
  const path = isEditable ? ApiPaths.UPDATE_ORDER(id!) : ApiPaths.CREATE_ORDER;
  const method = isEditable ? "PUT" : "POST";
  const response = await apiRequest(path, method, payload);
  if (response.success) return true;
  showLog(response.message || "Failed to create or update order");
  return false;
};

export const cancelOrderService = async (
  orderId: string,
  payload: Record<string, unknown>
): Promise<boolean> => {
  const response = await apiRequest(
    ApiPaths.ORDER_CANCLE_SERVICE(orderId),
    "PUT",
    payload
  );
  if (response.success) return true;
  showLog(response.message || "Failed to cancel order service");
  return false;
};

export const cancelOrder = async (
  id: string,
  payload: Record<string, unknown>
): Promise<boolean> => {
  const response = await apiRequest(ApiPaths.CANCLE_ORDER(id), "PUT", payload);
  if (response.success) return true;
  showLog(response.message || "Failed to cancel order");
  return false;
};

export const updateOrderService = async (
  payload: Record<string, unknown>,
  id: string
): Promise<boolean> => {
  const response = await apiRequest(
    ApiPaths.ORDER_UPDATE_SERVICE(id),
    "PUT",
    payload
  );
  if (response.success) return true;
  showLog(response.message || "Failed to update order service");
  return false;
};

export const payComission = async (
  payload: Record<string, unknown>
): Promise<boolean> => {
  try {
    const response = await apiRequest(ApiPaths.PAY_COMISSION, "POST", payload);
    return Boolean(response.success);
  } catch {
    return false;
  }
};

export type OrderRefundPayload = {
  order_id: string;
  refund_amount: number;
  from_admin_commission: boolean;
  from_partner_wallet: boolean;
  amount_from_admin_commission?: number;
  amount_from_partner_wallet?: number;
  description?: string;
};

export const submitOrderRefund = async (
  payload: OrderRefundPayload
): Promise<boolean> => {
  try {
    const response = await apiRequest(ApiPaths.ORDER_REFUND, "POST", payload);
    if (response.success) return true;
    showLog(response.message || "Refund failed");
    return false;
  } catch (error) {
    showLog(error);
    return false;
  }
};
