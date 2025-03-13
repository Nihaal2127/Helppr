export interface OrderItemModel {
    _id: string ;
    order_id: string;
    service_id: string;
    service_price: number;
    service_date: string;
    service_from_time: string;
    service_to_time: string;



    // product_id: string | null;
    // item_code: string;
    // product_title: string;
    // quantity: number;
    // price: number;
    // total_price: number;
    // tax_id: string;
    // is_tax_included: boolean;
    // gst_amount: number;
    // gst_percentage: number;
    // promo_code: string | null;
    // promo_value: number | null;
    // discount_amount: number | null;
    // promo_type: string | null;
}
