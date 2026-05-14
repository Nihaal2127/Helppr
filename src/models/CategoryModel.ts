export interface CategoryModel {
  _id: string;
  category_id: string;
  name: string;
  desc: string;
  services: number;
  helpers: number;
  state_ids?: string[];
  city_ids?: string[];
  service_ids?: string[];
  /** When API sends display names for list/hover (optional). */
  service_names?: string[];
  franchise_id?: string;
  franchise_name?: string;
  image_url: string;
  is_active: boolean;
  /** Present on `GET /category/getAll/:franchise_id` → `all_*`: assigned on/off for this franchise (vs global `is_active`). */
  franchise_active?: boolean;
  is_request?: boolean;
  is_rejected?: boolean | null;
  rejection_reason?: string;
  deleted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}
