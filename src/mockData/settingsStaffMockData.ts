import type { StaffSettingsModel } from "../models/SettingsModel";

export const staffMockSeed: Array<Omit<StaffSettingsModel, "id" | "createdDate">> = [
  {
    staffId: "STAFF-001",
    name: "Operations Lead",
    status: "active",
    screenPermissions: ["dashboards", "order-management", "reports"],
    allFranchises: false,
    franchisePermissions: ["Sunria Agro Agro", "Green Valley"],
  },
  {
    staffId: "STAFF-002",
    name: "Support Associate",
    status: "active",
    screenPermissions: ["support-center", "notifications"],
    allFranchises: true,
    franchisePermissions: [],
  },
];
