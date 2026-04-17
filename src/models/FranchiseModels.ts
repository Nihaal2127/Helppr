export interface FranchiseModel {
  _id?: string;
  name: string;
  state_id: string;
  state_name?: string;
  city_id: string;
  city_name?: string;
  area_id: string;
  area_name?: string;
  admin_id: string;
  admin_name?: string;
  is_active: boolean;
  /** Explicit category picks (multi-select). */
  category_ids?: string[];
  category_names?: string[];
  /** Service picks; may include all services from selected categories. */
  service_ids?: string[];
  service_names?: string[];
}