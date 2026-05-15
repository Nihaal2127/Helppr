import { OrderModel } from "./OrderModel";
import { OrderItemModel } from "./OrderItemModel";
import type { OfferModel } from "../models/SettingsModel";
import { formatDate, formatUtcToLocalTime } from "../../helper/utility";
import { getOffers } from "../../services/settingsService";

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
  const raw = order?.customer_payment_status?.trim();
  if (raw) return raw;
  if (order?.is_paid) return "Paid";
  return "Unpaid";
}

export function getPartnerPaymentStatusLabel(order?: OrderModel): string {
  const raw = order?.partner_payment_status?.trim();
  if (raw) return raw;
  const items = order?.service_items ?? [];
  if (!items.length) return "-";
  const paid = items.filter((i) => i.is_paid).length;
  if (paid === items.length) return "Paid";
  if (paid > 0) return "Partial";
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
