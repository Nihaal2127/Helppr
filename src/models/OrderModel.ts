import { OrderItemModel } from "./OrderItemModel";

export interface OrderModel {
    _id: string;
    unique_id: string;
    admin_id: string;
    partner_id: string | null;
    created_by_id: string | null;
    fitting_partner_id: string | null;
    employee_id: string | null;
    customer_id: string | null;
    phone_number: string;
    payment_id: string | null;
    order_items: OrderItemModel[];
    order_status: number;
    order_status_info: OrderStatusInfoModel[];
    order_date: string;
    sub_total: number;
    discount_amount: number;
    total_gst_amount: number;
    total_price: number;
    invoice_date: string;
    due_date: string;
    customer_email: string;
    comment: string | null;
    billing_address: string;
    fitting_date: string;
    fitting_time: string;
    is_paid: boolean;
    document_url: string;
    type: number;
    is_sent_to_account: boolean;
    deleted_at: string | null;
    updated_at: string | null;
    created_at: string;
    created_by_name: string | null;
    customer_name: string | null;
    fitting_partner_name: string | null;
    employee_name: string | null;
    payment_mode_name: string | null;
    document_file?: File;
}

export interface OrderStatusInfoModel {
    status: number;
    updated_at: string | null;
    _id: string;
}