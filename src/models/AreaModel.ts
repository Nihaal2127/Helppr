export interface AreaModel {
    _id: string;
    name: string | null;
    city_id: string | null;
    city_name?: string | null;
    is_active: boolean;
    deleted_at: string | null;
    created_at: string | null;
    updated_at: string | null;
}