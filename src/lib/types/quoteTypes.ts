export type QuoteTabKey = "new" | "pending" | "accepted" | "success" | "failed";

export type AddQuoteFormValues = {
  /** Super-admin / staff: franchise for `POST /quote/create`. */
  franchise_id?: string;
  /** Selected user id (dropdown value). */
  user_id: string;
  user_name: string;
  requested_services: string;
  requested_partner: string;
  employee_id: string;
  category_id: string;
  requested_date: string;
  /** End date when service schedule mode is `range`. */
  requested_date_to: string;
  requested_time: string;
  /** Start / end time when mode is `hourly`. */
  requested_time_from: string;
  requested_time_to: string;
  service_price: string;
  /** Optional; sent as `description` on create. */
  description: string;
};

export type QuoteRow = {
  _id: string;
  quote_id: string;
  requested_services: string;
  requested_partner: string;
  partner_name?: string;
  employee_id?: string;
  employee_name?: string;
  employee_phone?: string;
  user_name: string;
  door_no: string;
  street: string;
  city: string;
  requested_date: string;
  requested_time: string;
  service_price?: number;
  scheduled_date?: string;
  service_from_time?: string;
  service_to_time?: string;
  order_id?: string;
  services?: string;
  order_status?: string;
  payment_method?: string;
  payment_status?: string;
  payment_reference?: string;
  payment_date?: string;
  /**
   * UI quote status (example: "New", "Pending", "Accepted", "Success", "Failed")
   */
  status: string;
  /**
   * Enriched fields for New-tab quote view modal
   */
  user_id?: string;
  phone_number?: string;
  user_email?: string;
  user_city?: string;
  profile_url?: string | null;
  category_id?: string;
  category_name?: string;
  area?: string;
  landmark?: string;
  pincode?: string;
  service_id?: string;
  partner_id?: string;
  partner_user_id?: string;
  partner_phone?: string;
  partner_city?: string;
  partner_email?: string;
  franchise_id?: string;
  franchise_name?: string;
  address_id?: string;
  employee_email?: string;
  description?: string;
};
