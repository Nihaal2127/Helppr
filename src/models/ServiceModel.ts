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
  is_rejected?: boolean | null;
  approval_status?: "approve" | "approved" | "pending" | "rejected";
  rejection_reason?: string;
  deleted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  tax: number;
  commission: number;
  min_deposit_type: string;
  min_deposit_value: number;
}
