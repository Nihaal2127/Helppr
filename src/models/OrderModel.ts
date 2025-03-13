import { OrderItemModel } from "./OrderItemModel";

export interface OrderModel {
    _id: string;
    user_phone_number: string;
    user_id: string;
    user_name: string;
    user_location: string;
    user_address: string;
    city_id: string;
    category_id: string;
    payment_id: string | null;
    partner_id: string | null;
    created_by_id: string | null;
   
    order_items: OrderItemModel[];
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
}

export interface OrderStatusInfoModel {
    status: number;
    updated_at: string | null;
    _id: string;
}