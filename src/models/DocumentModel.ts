export interface DocumentModel {
    _id: string; 
    document_id: string | null;
    document_images :  string[] | [];
    is_optional: boolean | true; 
    name: string | null;
    partner_id: string | null;
    verification_id: string | null;
    verification_status: number | 1;
    deleted_at: string | null; 
    created_at: string | null;
    updated_at: string | null;
}
