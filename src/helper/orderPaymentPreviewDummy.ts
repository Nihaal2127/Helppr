import type { OrderModel } from "../models/OrderModel";
import {
    orderOfferDiscountAmount,
    orderRefundAmount,
    parseOrderMoneyField,
} from "./orderDisplayHelpers";

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
    const wantRefundDummy = !hasRealRefundFields(order) && (v >= 3 && v <= 5);
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

    (next as OrderModel & { __previewPaymentDummy?: boolean }).__previewPaymentDummy = true;
    return next;
}
