
export interface UserModel {
  _id: string;
  name: string | null;
  email: string | null;
  phone_number: string | null;
  address: string | null;
  landmark: string | null;
  state_id: string | null;
  city_id: string | null;
  pincode: string | null;
  profile_url: string | null;
  user_id: string | null;
  registration_id: string | null;
  is_from_web: boolean;
  is_active: boolean;
  is_business: boolean;
  type: number;
  registration_type: string | null;
  device_token: string | null;
  platform_type: number;
  business_info_id: string | null;
  auth_token: string | null;
  created_by_id: string | null;
  last_signin: string | null;
  password: string | null;
  current_password: string | null;
  new_password: string | null;
  confirm_password: string | null;
  deleted_at: string | null;
  created_at: string | null;
  updated_at: string | null;


  total_service: number | 0;
  service_paid: number | 0;
  service_unpaid: number | 0;
  in_progress_service: number | 0;
  completed_service: number | 0;
  cancelled_service: number | 0;
  my_services: string[] | [];
}


