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
  /** Menu keys from `mainMenuItems` granted to franchise employees */
  screenPermissions?: string[];
}

export interface StaffSettingsModel {
  id: string;
  staffId: string;
  name: string;
  status: ActiveStatus;
  createdDate: string;
  screenPermissions: string[];
  /** When true, staff may access all franchises; `franchisePermissions` is ignored */
  allFranchises: boolean;
  /** Franchise display names when `allFranchises` is false */
  franchisePermissions: string[];
}

export interface ExpenseCategoryModel {
  id: string;
  categoryName: string;
  subCategoryName: string;
  description?: string;
  createdDate: string;
}
