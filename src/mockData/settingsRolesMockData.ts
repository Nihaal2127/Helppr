import type { RoleSettingsModel } from "../models/SettingsModel";

export const rolesMockSeed: Array<
  Omit<RoleSettingsModel, "id" | "createdDate">
> = [
  {
    roleId: "ROLE-001",
    roleName: "Senior Franchise Admin",
    roleType: "franchise_admin",
    assignedFranchise: "Franchise Alpha",
    status: "active",
  },
  {
    roleId: "ROLE-002",
    roleName: "Service Executive",
    roleType: "employee",
    status: "active",
    screenPermissions: ["dashboards", "user-management", "quote-management"],
  },
];

