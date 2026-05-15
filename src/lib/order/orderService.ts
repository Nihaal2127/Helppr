import html2pdf from "html2pdf.js";
import { fetchOrderById } from "../../services/orderService";
import { invoicePdfTemplate } from "./invoicePdfTemplate";

export {
  ORDER_TAB_KEYS,
  cancelOrder,
  cancelOrderService,
  createOrUpdateOrder,
  deleteOrder,
  fetchCustomerOrders,
  fetchOrder,
  fetchOrderById,
  mapOrderTabCountsFromRecord,
  mapServerOrderRecord,
  payComission,
  submitOrderRefund,
  updateOrderService,
} from "../../services/orderService";
export type {
  OrderListFilters,
  OrderRefundPayload,
  OrderTabKey,
} from "../../services/orderService";

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
    html2pdf().from(invoiceHtml).set(html2pdfOptions).save();
  }
};
