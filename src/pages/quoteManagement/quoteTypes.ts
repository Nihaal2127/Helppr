export type QuoteTabKey = "new" | "pending" | "accepted" | "success" | "failed";

export type AddQuoteFormValues = {
  quote_id: string;
  user_name: string;
  requested_services: string;
  requested_partner: string;
  requested_date: string;
  requested_time: string;
  service_price: string;
};

export type QuoteRow = {
  _id: string;
  quote_id: string;
  requested_services: string;
  requested_partner: string;
  partner_name?: string;
  employee_id?: string;
  employee_name?: string;
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
};

