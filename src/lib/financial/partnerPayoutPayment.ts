/** Partner payout — uses global `PAYMENT_METHODS` from `paymentAndCurrency`. */

import { PAYMENT_METHODS, paymentMethodLabel } from "../global/paymentAndCurrency";
import type { PaymentMethodSlug } from "../global/paymentAndCurrency";

export const PARTNER_PAYOUT_PAYMENT_METHODS = PAYMENT_METHODS;

export type PartnerPayoutPaymentMethod = PaymentMethodSlug;

export function partnerPayoutPaymentMethodLabel(
  method: string | null | undefined
): string {
  return paymentMethodLabel(method);
}
