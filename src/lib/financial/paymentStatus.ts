/**
 * Financial order payments — customer / partner payment status slugs (query filters)
 * and display labels (API response + UI).
 */

export type CustomerPaymentStatusSlug =
  | "paid"
  | "unpaid"
  | "partially_paid"
  | "refund"
  | "partially_refund"
  | "completed";

export type PartnerPaymentStatusSlug =
  | "paid"
  | "unpaid"
  | "partially_paid"
  | "completed";

export const CUSTOMER_PAYMENT_STATUS_LABELS = [
  "Paid",
  "Unpaid",
  "Partially paid",
  "Refund",
  "Partially Refund",
  "Completed",
] as const;

export const PARTNER_PAYMENT_STATUS_LABELS = [
  "Paid",
  "Unpaid",
  "Partially paid",
  "Completed",
] as const;

export type CustomerPaymentStatusLabel =
  (typeof CUSTOMER_PAYMENT_STATUS_LABELS)[number];
export type PartnerPaymentStatusLabel =
  (typeof PARTNER_PAYMENT_STATUS_LABELS)[number];

const CUSTOMER_SLUG_TO_LABEL: Record<CustomerPaymentStatusSlug, CustomerPaymentStatusLabel> = {
  paid: "Paid",
  unpaid: "Unpaid",
  partially_paid: "Partially paid",
  refund: "Refund",
  partially_refund: "Partially Refund",
  completed: "Completed",
};

const PARTNER_SLUG_TO_LABEL: Record<PartnerPaymentStatusSlug, PartnerPaymentStatusLabel> = {
  paid: "Paid",
  unpaid: "Unpaid",
  partially_paid: "Partially paid",
  completed: "Completed",
};

const CUSTOMER_LABEL_TO_SLUG: Record<string, CustomerPaymentStatusSlug> = {
  paid: "paid",
  unpaid: "unpaid",
  "partially paid": "partially_paid",
  partially_paid: "partially_paid",
  partial: "partially_paid",
  refund: "refund",
  refunded: "refund",
  "partially refund": "partially_refund",
  "partially refunded": "partially_refund",
  partially_refund: "partially_refund",
  partially_refunded: "partially_refund",
  completed: "completed",
  pending: "unpaid",
};

const PARTNER_LABEL_TO_SLUG: Record<string, PartnerPaymentStatusSlug> = {
  paid: "paid",
  unpaid: "unpaid",
  "partially paid": "partially_paid",
  partially_paid: "partially_paid",
  partial: "partially_paid",
  completed: "completed",
  pending: "unpaid",
};

export function customerPaymentStatusLabelFromSlug(
  slug: string | null | undefined
): CustomerPaymentStatusLabel | "" {
  const key = String(slug ?? "").trim().toLowerCase() as CustomerPaymentStatusSlug;
  return CUSTOMER_SLUG_TO_LABEL[key] ?? "";
}

export function partnerPaymentStatusLabelFromSlug(
  slug: string | null | undefined
): PartnerPaymentStatusLabel | "" {
  const key = String(slug ?? "").trim().toLowerCase() as PartnerPaymentStatusSlug;
  return PARTNER_SLUG_TO_LABEL[key] ?? "";
}

export function normalizeCustomerPaymentStatusSlug(
  raw: string | null | undefined
): CustomerPaymentStatusSlug | "" {
  const k = String(raw ?? "").trim().toLowerCase();
  return (CUSTOMER_LABEL_TO_SLUG[k] as CustomerPaymentStatusSlug | undefined) ?? "";
}

export function normalizePartnerPaymentStatusSlug(
  raw: string | null | undefined
): PartnerPaymentStatusSlug | "" {
  const k = String(raw ?? "").trim().toLowerCase();
  return (PARTNER_LABEL_TO_SLUG[k] as PartnerPaymentStatusSlug | undefined) ?? "";
}

export const CUSTOMER_PAYMENT_STATUS_FILTER_OPTIONS: {
  value: "" | CustomerPaymentStatusSlug;
  label: string;
}[] = [
  { value: "", label: "All" },
  { value: "paid", label: "Paid" },
  { value: "unpaid", label: "Unpaid" },
  { value: "partially_paid", label: "Partially paid" },
  { value: "refund", label: "Refund" },
  { value: "partially_refund", label: "Partially Refund" },
  { value: "completed", label: "Completed" },
];

export const PARTNER_PAYMENT_STATUS_FILTER_OPTIONS: {
  value: "" | PartnerPaymentStatusSlug;
  label: string;
}[] = [
  { value: "", label: "All" },
  { value: "paid", label: "Paid" },
  { value: "unpaid", label: "Unpaid" },
  { value: "partially_paid", label: "Partially paid" },
  { value: "completed", label: "Completed" },
];

export const customerPaymentStatusSelectOptions = CUSTOMER_PAYMENT_STATUS_LABELS.map(
  (label) => ({ value: label, label })
);

export const partnerPaymentStatusSelectOptions = PARTNER_PAYMENT_STATUS_LABELS.map(
  (label) => ({ value: label, label })
);
