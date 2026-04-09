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
}