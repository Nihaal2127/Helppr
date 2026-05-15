import type { QuoteRow } from "../types/quoteTypes";
import type { QuoteViewData } from "./quoteViewTypes";

function coalesceText(fresh?: string, keep?: string): string {
  const next = String(fresh ?? "").trim();
  if (next) return next;
  return String(keep ?? "").trim();
}

/** Keep list / prior view values when a detail fetch returns sparse fields. */
export function mergeQuoteViewData(
  fresh: QuoteViewData,
  keep: QuoteViewData
): QuoteViewData {
  const merged: QuoteViewData = { ...keep, ...fresh };
  return {
    ...merged,
    quote_id: coalesceText(fresh.quote_id, keep.quote_id) || merged.quote_id,
    status: coalesceText(fresh.status, keep.status) || merged.status,
    requested_services: coalesceText(
      fresh.requested_services,
      keep.requested_services
    ),
    services_summary:
      coalesceText(fresh.services_summary, keep.services_summary) || undefined,
    requested_partner: coalesceText(
      fresh.requested_partner,
      keep.requested_partner
    ),
    category_name: coalesceText(fresh.category_name, keep.category_name) || undefined,
    description: coalesceText(fresh.description, keep.description) || undefined,
    requested_date: coalesceText(fresh.requested_date, keep.requested_date),
    requested_time: coalesceText(fresh.requested_time, keep.requested_time),
    scheduled_date:
      coalesceText(fresh.scheduled_date, keep.scheduled_date) || undefined,
    scheduled_time_from:
      coalesceText(fresh.scheduled_time_from, keep.scheduled_time_from) ||
      undefined,
    scheduled_time_to:
      coalesceText(fresh.scheduled_time_to, keep.scheduled_time_to) || undefined,
    user_name: coalesceText(fresh.user_name, keep.user_name),
    user_email: coalesceText(fresh.user_email, keep.user_email) || undefined,
    phone_number: coalesceText(fresh.phone_number, keep.phone_number) || undefined,
    partner_name: coalesceText(fresh.partner_name, keep.partner_name) || undefined,
    partner_email:
      coalesceText(fresh.partner_email, keep.partner_email) || undefined,
    partner_phone:
      coalesceText(fresh.partner_phone, keep.partner_phone) || undefined,
    partner_city: coalesceText(fresh.partner_city, keep.partner_city) || undefined,
    employee_name:
      coalesceText(fresh.employee_name, keep.employee_name) || undefined,
    employee_email:
      coalesceText(fresh.employee_email, keep.employee_email) || undefined,
    employee_phone:
      coalesceText(fresh.employee_phone, keep.employee_phone) || undefined,
    city: coalesceText(fresh.city, keep.city),
    area: coalesceText(fresh.area, keep.area) || undefined,
    state: coalesceText(fresh.state, keep.state) || undefined,
    pincode: coalesceText(fresh.pincode, keep.pincode) || undefined,
    address_line:
      coalesceText(fresh.address_line, keep.address_line) ||
      coalesceText(fresh.street, keep.street) ||
      undefined,
    street: coalesceText(fresh.street, keep.street),
    service_price:
      fresh.service_price != null && Number.isFinite(fresh.service_price)
        ? fresh.service_price
        : keep.service_price,
  };
}

export function toQuoteViewData(row: QuoteRow): QuoteViewData {
  return {
    _id: row._id,
    quote_id: row.quote_id,
    status: row.status,
    requested_services: row.requested_services,
    requested_partner: row.requested_partner,
    employee_id: row.employee_id,
    employee_name: row.employee_name,
    employee_phone: row.employee_phone,
    employee_email: row.employee_email,
    user_name: row.user_name,
    user_id: row.user_id,
    phone_number: row.phone_number,
    user_email: row.user_email,
    user_city: row.user_city ?? row.city,
    profile_url: row.profile_url,
    partner_profile_url: row.partner_profile_url,
    employee_profile_url: row.employee_profile_url,
    category_id: row.category_id,
    category_name: row.category_name,
    requested_date: row.requested_date,
    requested_time: row.requested_time,
    door_no: row.door_no,
    street: row.street,
    city: row.city,
    area: row.area,
    landmark: row.landmark,
    state: row.state,
    address_line: row.address_line,
    pincode: row.pincode,
    service_id: row.service_id,
    partner_id: row.partner_id,
    partner_name: row.partner_name,
    partner_user_id: row.partner_user_id,
    partner_phone: row.partner_phone,
    partner_city: row.partner_city,
    partner_email: row.partner_email,
    franchise_id: row.franchise_id,
    franchise_name: row.franchise_name,
    address_id: row.address_id,
    service_price: row.service_price,
    scheduled_date: row.scheduled_date,
    scheduled_time_from: row.service_from_time,
    scheduled_time_to: row.service_to_time,
    order_id: row.order_id,
    order_status: row.order_status,
    services_summary: row.services ?? row.requested_services,
    payment_method: row.payment_method,
    payment_status: row.payment_status,
    payment_reference: row.payment_reference,
    payment_date: row.payment_date,
    description: row.description,
  };
}
