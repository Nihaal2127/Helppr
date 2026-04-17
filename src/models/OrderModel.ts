import { CategoryModel } from "./CategoryModel";
import { CityModel } from "./CityModel";
import { OrderItemModel } from "./OrderItemModel";
import { UserModel } from "./UserModel";

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