import type { ExpenseCategoryModel } from "../models/SettingsModel";

export const expenseCategoriesMockSeed: Array<
  Omit<ExpenseCategoryModel, "id" | "createdDate">
> = [
  {
    categoryName: "Office Expense",
    subCategoryName: "Internet",
    description: "Monthly broadband charges",
  },
  {
    categoryName: "Travel Expense",
    subCategoryName: "Fuel",
    description: "Local travel fuel reimbursement",
  },
];

