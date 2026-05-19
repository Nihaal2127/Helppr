/** Order models and enums (single module). */

import { CategoryModel } from "../models/CategoryModel";
import { CityModel } from "../models/CityModel";
import { ServiceModel } from "../models/ServiceModel";
import { UserModel } from "../models/UserModel";

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

export const orderPaymentModeSelectOptions: { value: string; label: string }[] =
  Array.from(OrderPaymentModeEnum.entries()).map(([id, v]) => ({
    value: String(id),
    label: v.label,
  }));


export const OrderStatusEnum = new Map<number, { label: string }>([
  [1, { label: "Pending" }],
  [2, { label: "In Progress" }],
  [3, { label: "Completed" }],
  [4, { label: "Cancelled" }],
  [5, { label: "Refunded" }],
]);

/** Structured service locations (create flow); parent serializes to `service_address` for API. */
export type ServiceAddressCard = {
  id: string;
  stateId: string;
  cityId: string;
  postal: string;
  line: string;
  stateLabel?: string;
  cityLabel?: string;
  /** Exactly one card should be active (primary service location). */
  isActive?: boolean;
};

/** Row from `fetchCityDropDown` (create order passes the same list used for order city). */
export type AddressCityDropdownRow = {
  value: string;
  label: string;
  state_id?: string;
  state_name?: string;
};

export interface OrderItemModel {
  _id?: string;
  order_id?: string;
  user_id?: string;
  category_id?: string;
  service_id: string;
  service_price: number;
  partner_id: string;
  service_date: string;
  service_from_time: string;
  service_to_time: string;
  sub_total: number | 0;
  tax: number | 0;
  user_paltform_fee: number | 0;
  partner_commison_platform_fee: number | 0;
  partner_earning: number | 0;
  total_price: number | 0;
  admin_earning: number | 0;
  service_info?: ServiceModel;
  rating?: number | 0;
  cancellation_reasone?: string | null;
  service_status?: number | 0;
  is_paid?: boolean | false;
  partner_info?: UserModel | null;
  per_hour_price?: number;
  hours?: number;
  service_address?: string | null;
  address_cards?: ServiceAddressCard[];
}

export interface OrderModel {
  _id: string;
  user_phone_number: string;
  user_id: string;
  user_name: string;
  user_location: string;
  user_address: string;
  city_id: string;
  category_id: string;
  partner_id: string | null;
  created_by_id: string | null;
  service_items: OrderItemModel[];
  order_status: number;
  order_date: string;
  total_price: number;
  comment: string | null;
  is_paid: boolean;
  type: number;
  deleted_at: string | null;
  updated_at: string | null;
  created_at: string;
  created_by_name: string | null;
  unique_id: string | null;
  user_unique_id: string | null;
  address: string | null;
  cancellation_reasone: string | null;
  payment_mode_id: string | null;
  payment_mode: string | null;
  transaction_id: string | null;
  sub_total: number | 0;
  tax: number | 0;
  discount_amount: number | 0;
  user_paltform_fee: number | 0;
  partner_commison_platform_fee: number | 0;
  admin_earning: number | 0;
  created_by_info: UserModel;
  user_info: UserModel;
  city_info: CityModel;
  category_info: CategoryModel;
  order_status_info: OrderStatusInfoModel[] | [];
  /** Display / API: Paid | Unpaid | Partial — falls back to `is_paid` when absent */
  customer_payment_status?: string | null;
  partner_payment_status?: string | null;
  refund_amount?: number | null;
  /** Some APIs use this alias for refund total */
  return_amount?: number | string | null;
  offer_id?: string | null;
  offer_name?: string | null;
  offer_discount_amount?: number | null;
  /** Optional breakdown from API (snake_case) */
  total_offer_value?: number | string | null;
  admin_contribution?: number | string | null;
  partner_contribution?: number | string | null;
  /** How the refunded amount was funded (see `OrderRefundPayload` when refund was processed) */
  amount_from_admin_commission?: number | string | null;
  amount_from_partner_wallet?: number | string | null;
  from_admin_commission?: number | string | null;
  from_partner_wallet?: number | string | null;
  /** Set by client preview merge only — not from API */
  __previewPaymentDummy?: boolean;
}

export interface OrderStatusInfoModel {
  status: number;
  updated_at: string | null;
  _id: string;
}
