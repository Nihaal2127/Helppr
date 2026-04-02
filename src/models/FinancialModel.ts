import { UserModel } from "./UserModel";

/** Financial row ≈ order service line; names match OrderInfoDialog (`user_info.name`, `partner_info.name` per service). */
export interface FinancialModel {
  _id: string;
  order_id: string | null;
  order_unique_id?: string | null;
  user_id: string | null;
  user_unique_id?: string | null;
  user_name?: string | null;
  user_info?: Partial<UserModel> | null;
  partner_id: string | null;
  partner_unique_id?: string | null;
  partner_name?: string | null;
  partner_info?: Partial<UserModel> | null;
  category_id: string | null;
  service_status: number | 0;
  payment_mode_id: number | 0;
  service_id: string | null;
  service_date: string | null;
  service_from_time: string | null;
  service_to_time: string | null;
  sub_total: number | 0;
  tax: number | 0;
  user_paltform_fee: number | 0;
  partner_commison_platform_fee: number | 0;
  service_price:number | 0;
  total_price: number | 0;
  partner_earning: number | 0;
  admin_earning: number | 0;
  /** Order payments list — tax as percentage when API sends it */
  tax_percentage?: number | null;
  tax_percent?: number | null;
  commission_percentage?: number | null;
  commission_percent?: number | null;
  customer_paid_amount?: number | null;
  customer_pending_amount?: number | null;
  total_service_amount?: number | null;
  paid_to_partner?: number | null;
  pending_to_partner?: number | null;
  is_paid: boolean | false;
  cancellation_reasone: string | null;
  rating: number | 0;
  service_name: string | null;
  category_name: string | null;
  /** 1 = pending partner payment, 2 = paid (when API sends it on order_service rows). */
  partner_paid_status?: number | string | null;
  deleted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}


