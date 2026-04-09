export type OfferType = "percentage" | "fixed";
export type OfferApplicableOn = "quotes" | "orders";
export type ActiveStatus = "active" | "inactive";

export interface OfferModel {
  id: string;
  offerId: string;
  offerName: string;
  offerType: OfferType;
  totalOfferValue: number;
  adminContribution: number;
  partnerContribution: number;
  applicableOn: OfferApplicableOn;
  startDate: string;
  endDate: string;
  status: ActiveStatus;
  createdAt: string;
}

export interface RoleSettingsModel {
  id: string;
  roleId: string;
  roleName: string;
  roleType: "franchise_admin" | "employee";
  assignedFranchise?: string;
  status: ActiveStatus;
  createdDate: string;
  permissions?: string;
}

export interface ExpenseCategoryModel {
  id: string;
  categoryName: string;
  subCategoryName: string;
  description?: string;
  createdDate: string;
}
