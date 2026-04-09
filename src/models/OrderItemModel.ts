import { ServiceModel } from "./ServiceModel";
import { UserModel } from "./UserModel";

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
}
