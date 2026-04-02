/** Shared quote view shape (modal + list mapping). No runtime imports — avoids circular chunks with Routes/apiHelper. */
export type QuoteViewData = {
  quote_id: string;
  status: string;
  requested_services: string;
  requested_partner: string;
  user_name: string;
  user_id?: string;
  phone_number?: string;
  user_city?: string;
  profile_url?: string | null;
  category_id?: string;
  category_name?: string;
  requested_date: string;
  requested_time: string;
  door_no: string;
  street: string;
  city: string;
  area?: string;
  landmark?: string;
  pincode?: string;
  service_id?: string;
  partner_id?: string;
  /** Accepted (and similar) quote view */
  partner_name?: string;
  partner_user_id?: string;
  partner_phone?: string;
  partner_city?: string;
  /** Employee shown in quote view */
  employee_id?: string;
  employee_name?: string;
  service_price?: number;
  scheduled_date?: string;
  scheduled_time_from?: string;
  scheduled_time_to?: string;
  /** Success (completed order) quote view */
  order_id?: string;
  order_status?: string;
  services_summary?: string;
  final_price?: number;
  payment_method?: string;
  payment_status?: string;
  payment_reference?: string;
  payment_date?: string;
};
