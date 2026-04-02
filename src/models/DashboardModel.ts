export interface DashboardModel {
    total_service: number | 0;
    inactive_service: number | 0;
    active_service: number | 0;
    total_partner: number | 0;
    inactive_partner: number | 0;
    active_partner: number | 0;
    pending_order: number | 0;
    in_progress_order: number | 0;
    completed_order: number | 0;
    cancelled_order: number | 0;
    /** When set by API, used for quotes slice in Orders vs Quotes chart */
    total_quote?: number;
    /** When set by API, used for orders slice in Orders vs Quotes chart */
    total_order?: number;
    received_amount: number | 0;
    pending_amount: number | 0;
    revenue: number | 0;
    /** Customer-side payment total for the selected period */
    customer_amount: number | 0;
    /** Partner payout / partner share for the selected period */
    partner_amount: number | 0;
    /** Platform commission for the selected period */
    commission_amount: number | 0;
}
