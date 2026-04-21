import { ServiceModel } from "./ServiceModel";
import { UserModel } from "./UserModel";

/** Structured service locations (create flow); parent serializes to `service_address` for API. */
export type ServiceAddressCard = {
    id: string;
    stateId: string;
    cityId: string;
    postal: string;
    line: string;
    stateLabel?: string;
    cityLabel?: string;
    /** Exactly one card should be active (primary service location). */
    isActive?: boolean;
};

/** Row from `fetchCityDropDown` (create order passes the same list used for order city). */
export type AddressCityDropdownRow = {
    value: string;
    label: string;
    state_id?: string;
    state_name?: string;
};

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
    service_address?: string | null;
    address_cards?: ServiceAddressCard[];
}
