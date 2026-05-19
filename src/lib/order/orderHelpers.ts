/**
 * Order display, payment extension storage, and preview helpers.
 */
import type { OfferModel } from "../models/SettingsModel";
import type { OrderItemModel, OrderModel } from "./orderTypes";
import { formatDate, formatUtcToLocalTime } from "../../helper/utility";
import { getOffers } from "../../services/settingsService";
import {
  customerPaymentStatusLabelFromSlug,
  normalizeCustomerPaymentStatusSlug,
  normalizePartnerPaymentStatusSlug,
  partnerPaymentStatusLabelFromSlug,
} from "../financial/paymentStatus";

export function getPrimaryServiceItem(
  order?: OrderModel
): OrderItemModel | undefined {
  const items = order?.service_items;
  if (!items?.length) return undefined;
  return items[0];
}

export function getOrderPartnerDisplayName(order?: OrderModel): string {
  const fromItem = getPrimaryServiceItem(order)?.partner_info?.name;
  if (fromItem) return fromItem;
  return "-";
}

export function getCustomerPaymentStatusLabel(order?: OrderModel): string {
  const slug = normalizeCustomerPaymentStatusSlug(order?.customer_payment_status);
  if (slug) {
    const label = customerPaymentStatusLabelFromSlug(slug);
    if (label) return label;
  }
  const raw = order?.customer_payment_status?.trim();
  if (raw) return raw;
  if (order?.is_paid) return "Paid";
  return "Unpaid";
}

export function getPartnerPaymentStatusLabel(order?: OrderModel): string {
  const slug = normalizePartnerPaymentStatusSlug(order?.partner_payment_status);
  if (slug) {
    const label = partnerPaymentStatusLabelFromSlug(slug);
    if (label) return label;
  }
  const raw = order?.partner_payment_status?.trim();
  if (raw) return raw;
  const items = order?.service_items ?? [];
  if (!items.length) return "-";
  const paid = items.filter((i) => i.is_paid).length;
  if (paid === items.length) return "Paid";
  if (paid > 0) return "Partially paid";
  return "Unpaid";
}

export function formatServiceScheduleLine(item?: OrderItemModel): string {
  if (!item) return "-";
  const d = item.service_date ? formatDate(item.service_date) : "";
  const from = item.service_from_time
    ? formatUtcToLocalTime(item.service_from_time)
    : "";
  const to = item.service_to_time
    ? formatUtcToLocalTime(item.service_to_time)
    : "";
  const time = from && to ? `${from} – ${to}` : from || to || "";
  if (d && time) return `${d}, ${time}`;
  return d || time || "-";
}

/** Parses API money fields that may be number, string, or null. */
export function parseOrderMoneyField(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n =
    typeof v === "string"
      ? parseFloat(String(v).replace(/,/g, "").trim())
      : Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/** Refund / return total on the order (supports string amounts from API). */
export function orderRefundAmount(order?: OrderModel): number {
  if (!order) return 0;
  const raw = order.return_amount ?? order.refund_amount;
  return parseOrderMoneyField(raw);
}

/** True when the order has any offer metadata worth showing. */
export function orderHasOffer(order?: OrderModel): boolean {
  if (!order) return false;
  const id = order.offer_id != null && String(order.offer_id).trim() !== "";
  const name = Boolean(order.offer_name?.trim());
  const disc = parseOrderMoneyField(order.offer_discount_amount as unknown);
  return id || name || disc > 0;
}

export function orderOfferDiscountAmount(order?: OrderModel): number {
  if (!order) return 0;
  return parseOrderMoneyField(order.offer_discount_amount as unknown);
}

/** Split of how a refund was covered (admin commission vs partner wallet). */
export type OrderRefundBreakdown = {
  refundAmount: number;
  adminCommission: number;
  partnerWallet: number;
};

export function orderRefundBreakdown(order?: OrderModel): OrderRefundBreakdown {
  const refundAmount = orderRefundAmount(order);
  const adminCommission = parseOrderMoneyField(
    order?.amount_from_admin_commission ?? order?.from_admin_commission
  );
  const partnerWallet = parseOrderMoneyField(
    order?.amount_from_partner_wallet ?? order?.from_partner_wallet
  );
  return { refundAmount, adminCommission, partnerWallet };
}

/** Master offer template (value + who contributes) plus discount applied on this order. */
export type OrderOfferBreakdown = {
  totalOfferValue: number;
  adminContribution: number;
  partnerContribution: number;
  appliedDiscount: number;
  offerName?: string;
  /** Business / settings offer id for display */
  offerCode?: string;
  /** Create-order preview: % taken off `discountBaseForPercent` when offer is percentage (or unknown id fallback). */
  percentOffOrder?: number | null;
  /** Create-order preview: monetary base the % was applied to (prefers order total, else subtotal). */
  discountBaseForPercent?: number;
};

/** When an offer is selected on create order but not found in settings, use this % off order total. */
export const CREATE_ORDER_OFFER_FALLBACK_PERCENT = 20;

/**
 * Rupee discount for create-order preview / payment total.
 * - `percentage`: `totalOfferValue` is the percent (e.g. 20 → 20% of order total).
 * - `fixed`: `totalOfferValue` is max rupee discount, capped by order total (or subtotal if total is 0).
 */
export function computeCreateOrderOfferDiscountRupees(args: {
  offerId: string;
  fromSettings?: OfferModel;
  orderTotalPrice: number;
  orderSubTotal: number;
}): { discount: number; percentOff: number | null; baseUsed: number } {
  const id = args.offerId.trim();
  if (!id) return { discount: 0, percentOff: null, baseUsed: 0 };

  const total = Math.max(0, Number(args.orderTotalPrice) || 0);
  const sub = Math.max(0, Number(args.orderSubTotal) || 0);
  const base = total > 0.009 ? total : sub;

  if (!args.fromSettings) {
    const pct = CREATE_ORDER_OFFER_FALLBACK_PERCENT;
    const discount = Math.min((base * pct) / 100, base);
    return { discount, percentOff: pct, baseUsed: base };
  }

  if (args.fromSettings.offerType === "percentage") {
    const pct = Number(args.fromSettings.totalOfferValue) || 0;
    const discount = Math.min((base * pct) / 100, base);
    return { discount, percentOff: pct, baseUsed: base };
  }

  const flat = Math.max(0, Number(args.fromSettings.totalOfferValue) || 0);
  return { discount: Math.min(flat, base), percentOff: null, baseUsed: base };
}

/** Split a rupee discount between admin / partner using template ratio (or 60/40 if template has no parts). */
export function splitOfferContributionAmounts(
  discountRupees: number,
  template?: Pick<OfferModel, "adminContribution" | "partnerContribution">
): { admin: number; partner: number } {
  if (discountRupees <= 0.00001) return { admin: 0, partner: 0 };

  const adminT = Math.max(0, Number(template?.adminContribution) || 0);
  const partnerT = Math.max(0, Number(template?.partnerContribution) || 0);
  const parts = adminT + partnerT;
  if (parts > 0.009) {
    return {
      admin: discountRupees * (adminT / parts),
      partner: discountRupees * (partnerT / parts),
    };
  }

  return { admin: discountRupees * 0.6, partner: discountRupees * 0.4 };
}

/**
 * Resolves offer display: prefers explicit API fields on the order, else matches `offer_id`
 * to settings offers (same source as Create Order offer list).
 */
export function resolveOrderOfferBreakdown(
  order?: OrderModel
): OrderOfferBreakdown {
  const appliedDiscount = orderOfferDiscountAmount(order);
  const codeFromOrder =
    order?.offer_id != null
      ? String(order.offer_id).trim() || undefined
      : undefined;
  const empty: OrderOfferBreakdown = {
    totalOfferValue: 0,
    adminContribution: 0,
    partnerContribution: 0,
    appliedDiscount,
    offerName: order?.offer_name?.trim() || undefined,
    offerCode: codeFromOrder,
  };
  if (!order) return empty;

  const fromApiTotal = parseOrderMoneyField(order.total_offer_value as unknown);
  const fromApiAdmin = parseOrderMoneyField(
    order.admin_contribution as unknown
  );
  const fromApiPartner = parseOrderMoneyField(
    order.partner_contribution as unknown
  );
  if (fromApiTotal > 0 || fromApiAdmin > 0 || fromApiPartner > 0) {
    return {
      totalOfferValue: fromApiTotal || appliedDiscount,
      adminContribution: fromApiAdmin,
      partnerContribution: fromApiPartner,
      appliedDiscount,
      offerName: order.offer_name?.trim() || undefined,
      offerCode: codeFromOrder,
    };
  }

  const id = order.offer_id != null ? String(order.offer_id).trim() : "";
  if (id) {
    const match = getOffers().find(
      (o) => o.id === id || String(o.offerId) === id
    );
    if (match) {
      return {
        totalOfferValue: match.totalOfferValue,
        adminContribution: match.adminContribution,
        partnerContribution: match.partnerContribution,
        appliedDiscount,
        offerName: order.offer_name?.trim() || match.offerName,
        offerCode: String(match.offerId || match.id).trim() || codeFromOrder,
      };
    }
  }

  if (orderHasOffer(order)) {
    return {
      totalOfferValue: appliedDiscount,
      adminContribution: 0,
      partnerContribution: 0,
      appliedDiscount,
      offerName: order.offer_name?.trim() || undefined,
      offerCode: codeFromOrder,
    };
  }

  return empty;
}

/** When refund was applied, partner-side payment rows must stay read-only. */
export function partnerPaymentsEditLocked(order?: OrderModel): boolean {
  if (order?.__previewPaymentDummy) return false;
  return orderRefundAmount(order) > 0;
}

/** Order-level or primary line service address for display. */
export function getOrderServiceAddress(order?: OrderModel): string {
  const primary = getPrimaryServiceItem(order);
  const fromOrder = order?.address?.trim();
  const fromLine = primary?.service_address?.trim();
  const fromUser = order?.user_info?.address?.trim();
  return fromOrder || fromLine || fromUser || "-";
}

export function serviceNamesJoined(order?: OrderModel): string {
  const raw =
    order?.service_items
      ?.map((s) => s.service_info?.name)
      .filter((n): n is string => Boolean(n)) ?? [];
  if (!raw.length) return "-";
  const uniq: string[] = [];
  for (const n of raw) {
    if (!uniq.includes(n)) uniq.push(n);
  }
  return uniq.join(", ");
}

export const ORDER_PAYMENT_MARKER = "__OPAY1__";

export type OtherChargeRow = {
  id: string;
  amount: number;
  description: string;
  /** Extra service / line item label for this charge */
  serviceName?: string;
};
export type CustomerPaymentRow = {
  id: string;
  date: string;
  amount: number;
  type: string;
  description: string;
};
export type PartnerPaymentRow = {
  id: string;
  date: string;
  amount: number;
  description: string;
};

export type OrderPaymentExtV1 = {
  v: 1;
  serviceAmount: number;
  taxPercent: number;
  commissionPercent: number;
  otherCharges: OtherChargeRow[];
  customerPayments: CustomerPaymentRow[];
  partnerPayments: PartnerPaymentRow[];
};

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export function stripPaymentExtension(
  comment: string | null | undefined
): string {
  if (!comment) return "";
  const i = comment.indexOf(ORDER_PAYMENT_MARKER);
  return (i >= 0 ? comment.slice(0, i) : comment).trimEnd();
}

export function parsePaymentExtension(
  comment: string | null | undefined
): OrderPaymentExtV1 | null {
  if (!comment || !comment.includes(ORDER_PAYMENT_MARKER)) return null;
  const jsonPart = comment.slice(
    comment.indexOf(ORDER_PAYMENT_MARKER) + ORDER_PAYMENT_MARKER.length
  );
  try {
    const parsed = JSON.parse(jsonPart) as OrderPaymentExtV1;
    if (parsed?.v !== 1) return null;
    if (Array.isArray(parsed.otherCharges)) {
      parsed.otherCharges = parsed.otherCharges.map((r) => ({
        ...r,
        serviceName:
          typeof (r as OtherChargeRow).serviceName === "string"
            ? (r as OtherChargeRow).serviceName
            : "",
      }));
    }
    return parsed;
  } catch {
    return null;
  }
}

export function mergePaymentExtension(
  humanComment: string | null | undefined,
  ext: OrderPaymentExtV1
): string {
  const base = stripPaymentExtension(humanComment);
  const sep = base && !base.endsWith("\n") ? "\n" : "";
  return `${base}${sep}${ORDER_PAYMENT_MARKER}${JSON.stringify(ext)}`;
}

function impliedPercent(amount: number, base: number): number {
  if (
    !Number.isFinite(amount) ||
    !Number.isFinite(base) ||
    base <= 0 ||
    amount <= 0
  )
    return 0;
  return Math.min(100, Math.round((amount / base) * 10000) / 100);
}

/**
 * Tax / commission % for payment math: prefers `service_info`, then implied rates from
 * line-item amounts, then order-level amounts when the catalog fields are missing or zero.
 */
export function getServiceTaxCommissionPercents(
  primary?: OrderItemModel,
  order?: OrderModel
): { taxPct: number; commissionPct: number } {
  const catalogTax = Number(primary?.service_info?.tax ?? 0);
  const catalogComm = Number(primary?.service_info?.commission ?? 0);

  const itemSub = Number(primary?.sub_total ?? 0);
  const itemTaxAmt = Number(primary?.tax ?? 0);
  const itemCommAmt = Number(primary?.partner_commison_platform_fee ?? 0);

  const orderSub = Number(order?.sub_total ?? 0);
  const orderTaxAmt = Number(order?.tax ?? 0);
  const orderCommAmt = Number(order?.partner_commison_platform_fee ?? 0);

  let taxPct = Number.isFinite(catalogTax) && catalogTax > 0 ? catalogTax : 0;
  let commissionPct =
    Number.isFinite(catalogComm) && catalogComm > 0 ? catalogComm : 0;

  if (taxPct <= 0) taxPct = impliedPercent(itemTaxAmt, itemSub);
  if (taxPct <= 0) taxPct = impliedPercent(orderTaxAmt, orderSub);

  if (commissionPct <= 0) commissionPct = impliedPercent(itemCommAmt, itemSub);
  if (commissionPct <= 0)
    commissionPct = impliedPercent(orderCommAmt, orderSub);

  return {
    taxPct: Number.isFinite(taxPct) ? taxPct : 0,
    commissionPct: Number.isFinite(commissionPct) ? commissionPct : 0,
  };
}

export function roundMoney(n: number): number {
  return Math.round(Number.isFinite(n) ? n : 0);
}

export function computeTaxCommissionAmounts(
  serviceAmount: number,
  taxPct: number,
  commissionPct: number
): { taxAmount: number; commissionAmount: number } {
  const s = Math.max(0, serviceAmount);
  return {
    taxAmount: roundMoney((s * taxPct) / 100),
    commissionAmount: roundMoney((s * commissionPct) / 100),
  };
}

/** When no saved extension, show sensible default rows (matches common invoice-style lines). */
export function buildDefaultPaymentExtension(
  order: OrderModel,
  primary?: OrderItemModel
): OrderPaymentExtV1 {
  const { taxPct, commissionPct } = getServiceTaxCommissionPercents(
    primary,
    order
  );
  const serviceAmount = roundMoney(Number(order.sub_total ?? 0));
  void computeTaxCommissionAmounts(serviceAmount, taxPct, commissionPct);
  const payMode =
    order.payment_mode?.trim() ||
    (order.payment_mode_id === "1"
      ? "COD"
      : order.payment_mode_id === "2"
      ? "Online"
      : "");

  const d = order.order_date ? formatDate(order.order_date) : "";
  const userTotalRounded = roundMoney(
    Math.max(0, Number(order.total_price ?? 0))
  );

  const sub = serviceAmount;
  /** Partner obligation for this template (no extra charges / offer in defaults). */
  const partnerDue = roundMoney(Math.max(0, sub));

  /**
   * Unpaid defaults: two instalments (~25% + ~25%, each at least ₹1 when cap ≥ 2) so both Paid amount
   * cells show values; footer Total Paid / Balance still use cap − sum. Paid: full amount on row 1 only.
   */
  const defaultUnpaidTwoRowAmounts = (
    cap: number
  ): { first: number; second: number } => {
    const c = Math.max(0, cap);
    if (c <= 0) return { first: 0, second: 0 };
    if (c === 1) return { first: 1, second: 0 };
    let a = Math.max(1, roundMoney(c * 0.25));
    let b = Math.max(1, roundMoney(c * 0.25));
    if (a + b > c) {
      a = Math.max(1, Math.floor(c / 2));
      b = Math.max(1, c - a);
      if (a + b > c) {
        a = Math.max(1, c - 1);
        b = 1;
      }
    }
    return { first: a, second: b };
  };

  let customerRow1: number;
  let customerRow2: number;
  if (order.is_paid) {
    customerRow1 = userTotalRounded;
    customerRow2 = 0;
  } else {
    const split = defaultUnpaidTwoRowAmounts(userTotalRounded);
    customerRow1 = split.first;
    customerRow2 = split.second;
  }

  let partnerRow1: number;
  let partnerRow2: number;
  if (order.is_paid) {
    partnerRow1 = partnerDue;
    partnerRow2 = 0;
  } else {
    const split = defaultUnpaidTwoRowAmounts(partnerDue);
    partnerRow1 = split.first;
    partnerRow2 = split.second;
  }

  return {
    v: 1,
    serviceAmount,
    taxPercent: taxPct,
    commissionPercent: commissionPct,
    otherCharges: [],
    customerPayments: [
      {
        id: newId(),
        date: d,
        amount: customerRow1,
        type: payMode || "—",
        description: "Paid amount",
      },
      {
        id: newId(),
        date: d,
        amount: customerRow2,
        type: payMode || "—",
        description: "Balance amount",
      },
    ],
    partnerPayments: [
      { id: newId(), date: d, amount: partnerRow1, description: "Paid amount" },
      {
        id: newId(),
        date: d,
        amount: partnerRow2,
        description: "Balance amount",
      },
    ],
  };
}

export function resolvePaymentExtension(
  order: OrderModel,
  primary?: OrderItemModel
): OrderPaymentExtV1 {
  return (
    parsePaymentExtension(order.comment) ??
    buildDefaultPaymentExtension(order, primary)
  );
}

export function otherChargesTotal(charges: OtherChargeRow[]): number {
  return roundMoney(
    charges.reduce((a, c) => a + Math.max(0, Number(c.amount) || 0), 0)
  );
}

export function sumCustomerAmounts(rows: CustomerPaymentRow[]): number {
  return roundMoney(
    rows.reduce((a, r) => a + Math.max(0, Number(r.amount) || 0), 0)
  );
}

export function sumPartnerAmounts(rows: PartnerPaymentRow[]): number {
  return roundMoney(
    rows.reduce((a, r) => a + Math.max(0, Number(r.amount) || 0), 0)
  );
}

function normPaymentDescription(s: string | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

/** Returns the amount on the first row whose description matches (case-insensitive), or null. */
export function amountForPaymentDescription(
  rows: { amount: number; description?: string }[],
  description: string
): number | null {
  const target = description.trim().toLowerCase();
  const row = rows.find(
    (r) => normPaymentDescription(r.description) === target
  );
  if (!row) return null;
  return Number(row.amount) || 0;
}

/**
 * Legacy default template may start with a non-payment “echo” line (empty description, amount ≈ invoice)
 * while “Paid amount” + “Balance amount” already add up to the invoice. That first line must not count
 * toward Total Paid. If those template lines do not cover the invoice, the empty-desc rows are treated
 * as real payment lines (e.g. user cleared template rows and entered the full amount on line 1).
 */
function isDefaultStyleMirrorRow<
  T extends { amount: number; description?: string }
>(rows: T[], rowIndex: number, r: T, invoiceTotal: number): boolean {
  const d = normPaymentDescription(r.description);
  if (rowIndex !== 0 || d !== "") return false;
  const paidAmt = amountForPaymentDescription(rows, "Paid amount");
  const balAmt = amountForPaymentDescription(rows, "Balance amount");
  if (paidAmt === null || balAmt === null) return false;
  const inv = Math.max(0, Number(invoiceTotal) || 0);
  if (Math.abs(paidAmt + balAmt - inv) > 0.02) return false;
  return Math.abs((Number(r.amount) || 0) - inv) < 0.01;
}

/** Sum of cash lines for template tables: every row except balance, minus the first-row invoice echo when present. */
function sumTemplateSideCountedPayments<
  T extends { amount: number; description?: string }
>(rows: T[], invoiceTotal: number): number {
  return roundMoney(
    rows.reduce((acc, r, idx) => {
      if (normPaymentDescription(r.description) === "balance amount")
        return acc;
      if (isDefaultStyleMirrorRow(rows, idx, r, invoiceTotal)) return acc;
      return acc + Math.max(0, Number(r.amount) || 0);
    }, 0)
  );
}

/** User-facing headline: paid vs balance (uses template rows when present). */
export function customerPaidBalanceHeadline(
  ext: OrderPaymentExtV1,
  invoiceTotal: number,
  orderIsPaid: boolean
): { totalPaid: number; balance: number } {
  const inv = Math.max(0, Number(invoiceTotal) || 0);
  const totalPaidRaw = hasCustomerPaymentTemplateRows(ext)
    ? sumTemplateSideCountedPayments(ext.customerPayments, inv)
    : (() => {
        const paidRow = amountForPaymentDescription(
          ext.customerPayments,
          "Paid amount"
        );
        return paidRow !== null ? paidRow : orderIsPaid ? inv : 0;
      })();
  const totalPaid = Math.min(inv, Math.max(0, totalPaidRaw));
  /** Always derive balance from the current invoice total — stored "Balance amount" rows go stale. */
  const balance = Math.max(0, roundMoney(inv - totalPaid));
  return { totalPaid, balance };
}

/** Partner headline: paid vs balance (`invoiceTotal` = partner obligation before tax/commission). */
export function partnerPaidBalanceHeadline(
  ext: OrderPaymentExtV1,
  invoiceTotal: number,
  _serviceAmount: number,
  orderIsPaid: boolean
): { totalPaid: number; balance: number } {
  const inv = Math.max(0, Number(invoiceTotal) || 0);
  const totalPaidRaw = hasPartnerPaymentTemplateRows(ext)
    ? sumTemplateSideCountedPayments(ext.partnerPayments, inv)
    : (() => {
        const paidRow = amountForPaymentDescription(
          ext.partnerPayments,
          "Paid amount"
        );
        return paidRow !== null ? paidRow : orderIsPaid ? inv : 0;
      })();
  const totalPaid = Math.min(inv, Math.max(0, totalPaidRaw));
  const balance = Math.max(0, roundMoney(inv - totalPaid));
  return { totalPaid, balance };
}

function hasCustomerPaymentTemplateRows(ext: OrderPaymentExtV1): boolean {
  return ext.customerPayments.some((r) => {
    const n = normPaymentDescription(r.description);
    return n === "paid amount" || n === "balance amount";
  });
}

function hasPartnerPaymentTemplateRows(ext: OrderPaymentExtV1): boolean {
  return ext.partnerPayments.some((r) => {
    const n = normPaymentDescription(r.description);
    return n === "paid amount" || n === "balance amount";
  });
}

/**
 * Customer paid / balance for the payment editor: **sum of every row’s amount** (real-time with the table).
 * Balance is the remainder against the invoice cap. Read-only views still use `customerPaidBalanceHeadline`.
 */
export function customerPaidBalanceForEdit(
  ext: OrderPaymentExtV1,
  invoiceTotal: number,
  _orderIsPaid: boolean
): {
  totalPaid: number;
  balance: number;
} {
  const inv = Math.max(0, Number(invoiceTotal) || 0);
  const totalPaid = sumCustomerAmounts(ext.customerPayments);
  return { totalPaid, balance: Math.max(0, roundMoney(inv - totalPaid)) };
}

/** Partner paid / balance for the editor — sum of all partner payment rows vs partner obligation cap. */
export function partnerPaidBalanceForEdit(
  ext: OrderPaymentExtV1,
  invoiceTotal: number,
  _serviceAmount: number,
  _orderIsPaid: boolean
): { totalPaid: number; balance: number } {
  const inv = Math.max(0, Number(invoiceTotal) || 0);
  const totalPaid = sumPartnerAmounts(ext.partnerPayments);
  return { totalPaid, balance: Math.max(0, roundMoney(inv - totalPaid)) };
}

/**
 * Set to `false` when the API returns real offer/refund fields and you no longer need sample rows.
 * Dummy data is only merged when the order has no real offer and/or no real refund.
 */
export const ORDER_PAYMENT_PREVIEW_DUMMY = true;

function hashOrderKey(order: OrderModel): number {
  const s = String(order._id || order.unique_id || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function hasRealOfferFields(order: OrderModel): boolean {
  return (
    orderOfferDiscountAmount(order) > 0 ||
    parseOrderMoneyField(order.total_offer_value as unknown) > 0 ||
    parseOrderMoneyField(order.admin_contribution as unknown) > 0 ||
    parseOrderMoneyField(order.partner_contribution as unknown) > 0
  );
}

function hasRealRefundFields(order: OrderModel): boolean {
  return orderRefundAmount(order) > 0;
}

/**
 * For UI preview only: adds sample offer and/or refund breakdown on some orders
 * when the API did not send any (deterministic by order id).
 */
export function applyOrderPaymentPreviewDummy(order: OrderModel): OrderModel {
  if (!ORDER_PAYMENT_PREVIEW_DUMMY) return order;

  const v = hashOrderKey(order) % 10;
  const wantOfferDummy = !hasRealOfferFields(order) && (v <= 2 || v === 6);
  const wantRefundDummy = !hasRealRefundFields(order) && v >= 3 && v <= 5;
  const wantBothDummy =
    !hasRealOfferFields(order) && !hasRealRefundFields(order) && v === 7;

  if (!wantOfferDummy && !wantRefundDummy && !wantBothDummy) return order;

  const next: OrderModel = { ...order };
  let touched = false;

  if (wantOfferDummy || wantBothDummy) {
    next.offer_id = next.offer_id?.toString().trim() || "PREVIEW-OFR";
    next.offer_name = next.offer_name?.trim() || "Sample offer (UI preview)";
    next.total_offer_value = next.total_offer_value ?? 500;
    next.admin_contribution = next.admin_contribution ?? 200;
    next.partner_contribution = next.partner_contribution ?? 300;
    /** Keep in sync with total split (200+300) so the main offer line matches the breakdown. */
    next.offer_discount_amount =
      next.offer_discount_amount ??
      (parseOrderMoneyField(next.total_offer_value as unknown) || 500);
    touched = true;
  }

  if (wantRefundDummy || wantBothDummy) {
    next.refund_amount = next.refund_amount ?? 1919;
    next.amount_from_admin_commission = next.amount_from_admin_commission ?? 38;
    next.amount_from_partner_wallet = next.amount_from_partner_wallet ?? 0;
    touched = true;
  }

  if (!touched) return order;

  (
    next as OrderModel & { __previewPaymentDummy?: boolean }
  ).__previewPaymentDummy = true;
  return next;
}
