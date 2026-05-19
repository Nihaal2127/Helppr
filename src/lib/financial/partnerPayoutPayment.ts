/** Single `payment_method` on partner payout create + ledger (no separate payment_type). */

export const PARTNER_PAYOUT_PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "imps", label: "IMPS" },
  { value: "neft", label: "NEFT" },
  { value: "rtgs", label: "RTGS" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "card", label: "Card" },
  { value: "wallet", label: "Wallet" },
] as const;

export type PartnerPayoutPaymentMethod =
  (typeof PARTNER_PAYOUT_PAYMENT_METHODS)[number]["value"];

const LABEL_BY_VALUE = Object.fromEntries(
  PARTNER_PAYOUT_PAYMENT_METHODS.map((o) => [o.value, o.label])
) as Record<string, string>;

export function partnerPayoutPaymentMethodLabel(
  method: string | null | undefined
): string {
  const key = String(method ?? "").trim().toLowerCase();
  if (!key) return "—";
  return LABEL_BY_VALUE[key] ?? key.replace(/_/g, " ");
}
