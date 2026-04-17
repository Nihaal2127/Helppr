import { OrderModel } from "../models/OrderModel";
import { OrderItemModel } from "../models/OrderItemModel";
import { formatDate } from "./utility";

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
export type PartnerPaymentRow = { id: string; date: string; amount: number; description: string };

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

export function stripPaymentExtension(comment: string | null | undefined): string {
    if (!comment) return "";
    const i = comment.indexOf(ORDER_PAYMENT_MARKER);
    return (i >= 0 ? comment.slice(0, i) : comment).trimEnd();
}

export function parsePaymentExtension(comment: string | null | undefined): OrderPaymentExtV1 | null {
    if (!comment || !comment.includes(ORDER_PAYMENT_MARKER)) return null;
    const jsonPart = comment.slice(comment.indexOf(ORDER_PAYMENT_MARKER) + ORDER_PAYMENT_MARKER.length);
    try {
        const parsed = JSON.parse(jsonPart) as OrderPaymentExtV1;
        if (parsed?.v !== 1) return null;
        if (Array.isArray(parsed.otherCharges)) {
            parsed.otherCharges = parsed.otherCharges.map((r) => ({
                ...r,
                serviceName: typeof (r as OtherChargeRow).serviceName === "string" ? (r as OtherChargeRow).serviceName : "",
            }));
        }
        return parsed;
    } catch {
        return null;
    }
}

export function mergePaymentExtension(humanComment: string | null | undefined, ext: OrderPaymentExtV1): string {
    const base = stripPaymentExtension(humanComment);
    const sep = base && !base.endsWith("\n") ? "\n" : "";
    return `${base}${sep}${ORDER_PAYMENT_MARKER}${JSON.stringify(ext)}`;
}

export function getServiceTaxCommissionPercents(primary?: OrderItemModel): { taxPct: number; commissionPct: number } {
    const taxPct = Number(primary?.service_info?.tax ?? 0);
    const commissionPct = Number(primary?.service_info?.commission ?? 0);
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
export function buildDefaultPaymentExtension(order: OrderModel, primary?: OrderItemModel): OrderPaymentExtV1 {
    const { taxPct, commissionPct } = getServiceTaxCommissionPercents(primary);
    const serviceAmount = roundMoney(Number(order.sub_total ?? 0));
    const { taxAmount, commissionAmount } = computeTaxCommissionAmounts(serviceAmount, taxPct, commissionPct);
    const payMode =
        order.payment_mode?.trim() ||
        (order.payment_mode_id === "1" ? "COD" : order.payment_mode_id === "2" ? "Online" : "");

    const d = order.order_date ? formatDate(order.order_date) : "";
    const userTotal = Number(order.total_price ?? 0);
    const userPaid = order.is_paid ? userTotal : 0;
    const userBal = order.is_paid ? 0 : userTotal;

    const sub = serviceAmount;
    const partnerPaid = order.is_paid ? sub : 0;
    const partnerBal = order.is_paid ? 0 : Math.max(0, userTotal - partnerPaid);

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
                amount: userTotal,
                type: payMode || "—",
                description: "",
            },
            { id: newId(), date: d, amount: userPaid, type: payMode || "—", description: "Paid amount" },
            { id: newId(), date: d, amount: userBal, type: payMode || "—", description: "Balance amount" },
        ],
        partnerPayments: [
            { id: newId(), date: d, amount: sub, description: "" },
            { id: newId(), date: d, amount: partnerPaid, description: "Paid amount" },
            { id: newId(), date: d, amount: partnerBal, description: "Balance amount" },
        ],
    };
}

export function resolvePaymentExtension(order: OrderModel, primary?: OrderItemModel): OrderPaymentExtV1 {
    return parsePaymentExtension(order.comment) ?? buildDefaultPaymentExtension(order, primary);
}

export function otherChargesTotal(charges: OtherChargeRow[]): number {
    return roundMoney(charges.reduce((a, c) => a + Math.max(0, Number(c.amount) || 0), 0));
}

export function sumCustomerAmounts(rows: CustomerPaymentRow[]): number {
    return roundMoney(rows.reduce((a, r) => a + Math.max(0, Number(r.amount) || 0), 0));
}

export function sumPartnerAmounts(rows: PartnerPaymentRow[]): number {
    return roundMoney(rows.reduce((a, r) => a + Math.max(0, Number(r.amount) || 0), 0));
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
    const row = rows.find((r) => normPaymentDescription(r.description) === target);
    if (!row) return null;
    return Number(row.amount) || 0;
}

/** User-facing headline: paid vs balance (uses template rows when present). */
export function customerPaidBalanceHeadline(
    ext: OrderPaymentExtV1,
    invoiceTotal: number,
    orderIsPaid: boolean
): { totalPaid: number; balance: number } {
    const paidRow = amountForPaymentDescription(ext.customerPayments, "Paid amount");
    const balRow = amountForPaymentDescription(ext.customerPayments, "Balance amount");
    const totalPaid = paidRow !== null ? paidRow : orderIsPaid ? invoiceTotal : 0;
    const balance = balRow !== null ? balRow : Math.max(0, invoiceTotal - totalPaid);
    return { totalPaid, balance };
}

/** Partner headline: paid vs balance (balance defaults against invoice total). */
export function partnerPaidBalanceHeadline(
    ext: OrderPaymentExtV1,
    invoiceTotal: number,
    serviceAmount: number,
    orderIsPaid: boolean
): { totalPaid: number; balance: number } {
    const paidRow = amountForPaymentDescription(ext.partnerPayments, "Paid amount");
    const balRow = amountForPaymentDescription(ext.partnerPayments, "Balance amount");
    const totalPaid = paidRow !== null ? paidRow : orderIsPaid ? serviceAmount : 0;
    const balance = balRow !== null ? balRow : Math.max(0, invoiceTotal - totalPaid);
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
 * Customer paid / balance for the payment editor: uses Paid amount & Balance amount rows when present
 * (same as read-only view); otherwise total paid is the sum of all payment lines and balance is the remainder.
 */
export function customerPaidBalanceForEdit(ext: OrderPaymentExtV1, invoiceTotal: number, orderIsPaid: boolean): {
    totalPaid: number;
    balance: number;
} {
    if (hasCustomerPaymentTemplateRows(ext)) {
        return customerPaidBalanceHeadline(ext, invoiceTotal, orderIsPaid);
    }
    const totalPaid = sumCustomerAmounts(ext.customerPayments);
    return { totalPaid, balance: Math.max(0, roundMoney(invoiceTotal - totalPaid)) };
}

/** Partner paid / balance for the payment editor (same rules as customer). */
export function partnerPaidBalanceForEdit(
    ext: OrderPaymentExtV1,
    invoiceTotal: number,
    serviceAmount: number,
    orderIsPaid: boolean
): { totalPaid: number; balance: number } {
    if (hasPartnerPaymentTemplateRows(ext)) {
        return partnerPaidBalanceHeadline(ext, invoiceTotal, serviceAmount, orderIsPaid);
    }
    const totalPaid = sumPartnerAmounts(ext.partnerPayments);
    return { totalPaid, balance: Math.max(0, roundMoney(invoiceTotal - totalPaid)) };
}
