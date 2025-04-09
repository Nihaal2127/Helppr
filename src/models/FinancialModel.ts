
export interface FinancialModel {
  _id: string;
  order_id: string | null;
  user_id: string | null;
  partner_id: string | null;
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
  is_paid: boolean | false;
  cancellation_reasone: string | null;
  rating: number | 0;
  service_name: string | null;
  category_name: string | null;
  deleted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}


