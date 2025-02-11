
export interface AdminModel {
    _id: string;
    auth_token:string;
    first_name: string;
    last_name: string;
    nick_name: string;
    company_name: string;
    abn_number: string;
    phone_number: string;
    email: string;
    password: string | null;
    confirm_password: string | null;
    address: string;
    city: string;
    state: string;
    country: string;
    postcode: string;
    last_signin: string;
    membership_id: string | null;
    deleted_at: string | null;
    created_at: string;
    updated_at: string;
  }
  