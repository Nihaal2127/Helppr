import { BankAccountModel } from "./BankAccountModel";
import { DocumentModel } from "./DocumentModel";

export interface UserModel {
  _id: string;
  name: string | null;
  email: string | null;
  phone_number: string | null;
  address: string | null;
  landmark: string | null;
  state_id: string | null;
  city_id: string | null;
  state_name: string | null;
  city_name: string | null;
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
  total_amount: number | 0;

  /** Partner payout / wallet list (when API sends them). */
  total_wallet_amount?: number | null;
  last_withdraw_amount?: number | null;
  last_withdraw_date?: string | null;
  /** Text label for wallet type / rules (API may use other keys — map in UI if needed). */
  wallet_definition?: string | null;

  no_of_services?: number | null;
  total_earnings?: number | null;
  bal_payment?: number | null;

  total_payment: number | 0;
  paid_amount: number | 0;
  balance_amount: string | null;
  received_payment: number | 0;
  in_progress_payment: number | 0;
  refund_payment: number | 0;
  payment_mode: string | null;
  last_paid_date: string | null;
  last_service_date: string | null;

  total_service: number | 0;
  service_paid: number | 0;
  service_unpaid: number | 0;
  in_progress_service: number | 0;
  completed_service: number | 0;
  cancelled_service: number | 0;
  my_services: string[] | [];

  bank_account: BankAccountModel | null;
  documents: DocumentModel[] | [];

  /** Partner catalog (when API returns them). */
  category_ids?: string[] | null;
  service_ids?: string[] | null;
  category_names?: string[] | null;
  service_names?: string[] | null;

  /** Partner verification list (`/user/getVerificationAll`) when API returns these fields. */
  verification_id?: string | null;
  verification_status?: number;
  submitted_at?: string | null;
  verified_at?: string | null;
  document_uploaded_count?: number;
}


