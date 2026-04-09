import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";
import { OrderModel } from "../models/OrderModel";
import { showLog } from "../helper/utility";
import { invoicePdfTemplate } from "../pages/invoice/invoicePdfTemplate";
import html2pdf from "html2pdf.js";
import type { ServerTableSortBy } from "../helper/serverTableSort";

export const fetchOrder = async (
  page: number,
  pageSize: number,
  filters: { keyword?: string; status?: string; sort?: string; },
  sortBy: ServerTableSortBy = []
): Promise<{ response: boolean, orders: OrderModel[]; totalPages: number }> => {
  const primarySort = sortBy[0];
  const params = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
    ...(filters.keyword && { keyword: filters.keyword }),
    ...(filters.status && filters.status !== "All" && { order_status: filters.status.toLowerCase() }),
    ...(filters.sort && { sort: filters.sort }),
    ...(primarySort?.id && { sort_by: primarySort.id }),
    ...(primarySort && { sort_order: primarySort.desc ? "desc" : "asc" }),
  });

  const response = await apiRequest(
    `${ApiPaths.GET_ORDER()}?${params.toString()}`,
    "GET"
  );

  if (response.success) {
    return {
      response: true,
      orders: response.data.records,
      totalPages: response.data.totalPages,
    };
  } else {
    showLog(response.message || "Failed to fetch orders");
    return {
      response: false,
      orders: [],
      totalPages: 0,
    };
  }
};

export const fetchOrderById = async (
  id: string,
  options?: { skipLoader?: boolean }
): Promise<{ response: boolean, order: OrderModel | null; }> => {
  const response = await apiRequest(
    `${ApiPaths.GET_ORDER_BY_ID()}/${id}`,
    "GET",
    undefined,
    false,
    options?.skipLoader ?? false
  );
  if (response.success) {
    return {
      response: true,
      order: response.data.record,
    };
  } else {
    return {
      response: false,
      order: null,
    };
  }
};

export const deleteOrder = async (id: string): Promise<boolean> => {
  const response = await apiRequest(ApiPaths.DELETE_ORDER(id), "DELETE");
  if (response.success) {
    return true;
  } else {
    showLog(response.message || "Failed to delete order");
    return false;
  }
};

export const createOrUpdateOrder = async (
  payload: any,
  isEditable: boolean,
  id?: string
): Promise<boolean> => {
  const path = isEditable ? ApiPaths.UPDATE_ORDER(id!) : ApiPaths.CREATE_ORDER;
  const method = isEditable ? "PUT" : "POST";

  const response = await apiRequest(path, method, payload);
  if (response.success) {
    return true;
  } else {
    showLog(response.message || "Failed to create or update order");
    return false;
  }
};

export const cancelOrderService = async (orderId: string, payload: any): Promise<boolean> => {
  const response = await apiRequest(ApiPaths.ORDER_CANCLE_SERVICE(orderId), "PUT", payload);
  if (response.success) {
    return true;
  } else {
    showLog(response.message || "Failed to order cancle service");
    return false;
  }
};

export const cancelOrder = async (id: string, payload: any): Promise<boolean> => {
  const response = await apiRequest(ApiPaths.CANCLE_ORDER(id), "PUT", payload);
  if (response.success) {
    return true;
  } else {
    showLog(response.message || "Failed to order cancle order");
    return false;
  }
};

export const updateOrderService = async (
  payload: any,
  id: string
): Promise<boolean> => {
  const response = await apiRequest(ApiPaths.ORDER_UPDATE_SERVICE(id), "PUT", payload);
  if (response.success) {
    return true;
  }
  return false;
};

export const payComission = async (
  payload: any,
): Promise<boolean> => {
  try {
    const response = await apiRequest(ApiPaths.PAY_COMISSION, "POST", payload);
    if (response.success) {
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error fetching creating order:", error);
    return false;
  }
};

export type OrderRefundPayload = {
  order_id: string;
  refund_amount: number;
  from_admin_commission: boolean;
  from_partner_wallet: boolean;
  /** When both sources are selected, amounts per source (should sum to refund_amount). */
  amount_from_admin_commission?: number;
  amount_from_partner_wallet?: number;
  description?: string;
};

export const submitOrderRefund = async (payload: OrderRefundPayload): Promise<boolean> => {
  try {
    const response = await apiRequest(ApiPaths.ORDER_REFUND, "POST", payload);
    if (response.success) {
      return true;
    }
    showLog(response.message || "Refund failed");
    return false;
  } catch (error) {
    showLog(error);
    return false;
  }
};

export const downloadInvoice = async (orderId: string) => {
  const { response, order } = await fetchOrderById(orderId);
  if (response && order) {
    const invoiceHtml = invoicePdfTemplate(order);
    const html2pdfOptions = {
      margin: 0,
      filename: `invoice_${order.unique_id}.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };
    html2pdf()
      .from(invoiceHtml)
      .set(html2pdfOptions)
      .save();
  }
};