export const PaymentEnum = new Map<number, { label: string }>([
  [1, { label: "COD" }],
  [2, { label: "Online" }],
]);

/** Order `payment_mode_id` — used in order dialogs, order list, and invoice (not expense payment method). */
export const OrderPaymentModeEnum = new Map<number, { label: string }>([
  [1, { label: "Paid" }],
  [2, { label: "Pending" }],
  [3, { label: "Partially paid" }],
  [4, { label: "Refunds" }],
  [5, { label: "Partially refund" }],
]);

export const orderPaymentModeSelectOptions: { value: string; label: string }[] = Array.from(
  OrderPaymentModeEnum.entries()
).map(([id, v]) => ({ value: String(id), label: v.label }));