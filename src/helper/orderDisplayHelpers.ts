import { OrderModel } from "../models/OrderModel";
import { OrderItemModel } from "../models/OrderItemModel";
import { formatDate, formatUtcToLocalTime } from "./utility";
import { getOffers } from "../services/settingsService";

export function getPrimaryServiceItem(order?: OrderModel): OrderItemModel | undefined {
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
  const from = item.service_from_time ? formatUtcToLocalTime(item.service_from_time) : "";
  const to = item.service_to_time ? formatUtcToLocalTime(item.service_to_time) : "";
  const time = from && to ? `${from} – ${to}` : from || to || "";
  if (d && time) return `${d}, ${time}`;
  return d || time || "-";
}

/** Parses API money fields that may be number, string, or null. */
export function parseOrderMoneyField(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "string" ? parseFloat(String(v).replace(/,/g, "").trim()) : Number(v);
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
};

/**
 * Resolves offer display: prefers explicit API fields on the order, else matches `offer_id`
 * to settings offers (same source as Create Order offer list).
 */
export function resolveOrderOfferBreakdown(order?: OrderModel): OrderOfferBreakdown {
  const appliedDiscount = orderOfferDiscountAmount(order);
  const codeFromOrder = order?.offer_id != null ? String(order.offer_id).trim() || undefined : undefined;
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
  const fromApiAdmin = parseOrderMoneyField(order.admin_contribution as unknown);
  const fromApiPartner = parseOrderMoneyField(order.partner_contribution as unknown);
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
    const match = getOffers().find((o) => o.id === id || String(o.offerId) === id);
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
