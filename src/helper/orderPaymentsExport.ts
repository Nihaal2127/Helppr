import { AppConstant } from "../constant/AppConstant";
import { FinancialModel } from "../models/FinancialModel";
import { formatDate } from "./utility";

function orderStatusLabel(serviceStatus: number): string {
  if (serviceStatus === 3) return "Completed";
  if (serviceStatus === 2) return "In progress";
  if (!serviceStatus) return "-";
  return String(serviceStatus);
}

const HEADERS = [
  "SR No",
  "Order ID",
  "User Name",
  "Partner Name",
  "Service Name",
  "Service Date",
  "Total Price",
  "Tax (%)",
  "Commission (%)",
  "Customer Paid Amount",
  "Customer Pending Amount",
  "Total Service Amount",
  "Paid to Partner",
  "Pending to Partner",
  "Order status",
] as const;

function csvEscape(cell: string): string {
  const s = cell == null ? "" : String(cell);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function money(v: number | null | undefined): string {
  if (v === undefined || v === null) return "-";
  return `${AppConstant.currencySymbol}${v}`;
}

/** Mirrors `orderPayments` table cell values for export. */
export function financialModelToExportRow(row: FinancialModel, index0: number): string[] {
  const taxV = row.tax_percentage ?? row.tax_percent;
  const taxStr = taxV != null ? `${taxV}%` : "-";
  const commV = row.commission_percentage ?? row.commission_percent;
  const commStr = commV != null ? `${commV}%` : "-";

  const paidAmt =
    row.customer_paid_amount ?? (row.is_paid ? row.total_price : undefined);
  const pendingAmt =
    row.customer_pending_amount ?? (!row.is_paid ? row.total_price : undefined);

  const totalSvc = row.total_service_amount ?? row.service_price;

  return [
    String(index0 + 1),
    row.order_unique_id != null && row.order_unique_id !== "" ? String(row.order_unique_id) : "-",
    row.user_info?.name || "-",
    row.partner_info?.name ?? "-",
    row.service_name ?? "-",
    formatDate(row.service_date ? row.service_date : ""),
    money(row.total_price),
    taxStr,
    commStr,
    paidAmt !== undefined && paidAmt !== null ? money(paidAmt) : "-",
    pendingAmt !== undefined && pendingAmt !== null ? money(pendingAmt) : "-",
    totalSvc !== undefined && totalSvc !== null ? money(totalSvc) : "-",
    money(row.paid_to_partner),
    money(row.pending_to_partner),
    orderStatusLabel(row.service_status),
  ];
}

export function buildOrderPaymentsCsv(rows: FinancialModel[]): string {
  const lines = [
    HEADERS.join(","),
    ...rows.map((r, i) => financialModelToExportRow(r, i).map(csvEscape).join(",")),
  ];
  return `\uFEFF${lines.join("\r\n")}`;
}

export function downloadOrderPaymentsCsv(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
