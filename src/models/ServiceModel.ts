export interface ServiceModel {
  _id: string;
  service_id: string;
  name: string;
  desc: string;
  category_id: string;
  category_name: string;
  price: number;
  helpers: string;
  state_ids: string[];
  city_ids: string[];
  image_url: string;
  is_active: boolean;
  is_request?: boolean;
  /** Legacy moderation flag; use `approval_status` when API sends it. */
  is_rejected?: boolean | null;
  /** New API: `pending` | `approved` | `rejected` (or `approve` / `reject`). */
  approval_status?: string;
  rejection_reason?: string;
  payment_type?: string;
  minimum_deposit?: number;
  requested_by?: { id?: string; name?: string } | string;
  deleted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  tax: number;
  commission: number;
  min_deposit_type: string;
  min_deposit_value: number;
}
