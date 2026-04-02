import {
  ExpenseCategoryModel,
  OfferModel,
  RoleSettingsModel,
} from "../models/SettingsModel";

const OFFERS_KEY = "helper.settings.offers.v1";
const ROLES_KEY = "helper.settings.roles.v1";
const EXPENSE_CATEGORY_KEY = "helper.settings.expense-categories.v1";

const parseList = <T>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveList = <T>(key: string, value: T[]) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const ensureSettingsSeedData = () => {
  if (parseList<OfferModel>(OFFERS_KEY).length === 0) {
    const now = new Date().toISOString();
    saveList<OfferModel>(OFFERS_KEY, [
      {
        id: generateId(),
        offerId: "OFF-001",
        offerName: "New User 20%",
        offerType: "percentage",
        totalOfferValue: 20,
        adminContribution: 12,
        partnerContribution: 8,
        applicableOn: "orders",
        startDate: now,
        endDate: now,
        status: "active",
        createdAt: now,
      },
    ]);
  }

  if (parseList<RoleSettingsModel>(ROLES_KEY).length === 0) {
    const now = new Date().toISOString();
    saveList<RoleSettingsModel>(ROLES_KEY, [
      {
        id: generateId(),
        roleId: "ROLE-001",
        roleName: "Senior Franchise Admin",
        roleType: "franchise_admin",
        assignedFranchise: "Franchise Alpha",
        status: "active",
        createdDate: now,
      },
      {
        id: generateId(),
        roleId: "ROLE-002",
        roleName: "Service Executive",
        roleType: "employee",
        status: "active",
        createdDate: now,
      },
    ]);
  }

  if (parseList<ExpenseCategoryModel>(EXPENSE_CATEGORY_KEY).length === 0) {
    const now = new Date().toISOString();
    saveList<ExpenseCategoryModel>(EXPENSE_CATEGORY_KEY, [
      {
        id: generateId(),
        categoryName: "Office Expense",
        subCategoryName: "Internet",
        description: "Monthly broadband charges",
        createdDate: now,
      },
    ]);
  }
};

export const getOffers = () => parseList<OfferModel>(OFFERS_KEY);
export const saveOffer = (payload: Omit<OfferModel, "id" | "createdAt">, id?: string) => {
  const all = getOffers();
  if (id) {
    saveList(
      OFFERS_KEY,
      all.map((item) => (item.id === id ? { ...item, ...payload } : item))
    );
    return;
  }
  saveList(OFFERS_KEY, [
    {
      ...payload,
      id: generateId(),
      createdAt: new Date().toISOString(),
    },
    ...all,
  ]);
};
export const voidOffer = (id: string) => {
  saveList(
    OFFERS_KEY,
    getOffers().map((item) =>
      item.id === id ? { ...item, status: "inactive" as const } : item
    )
  );
};

export const getRoles = () => parseList<RoleSettingsModel>(ROLES_KEY);
export const saveRole = (
  payload: Omit<RoleSettingsModel, "id" | "createdDate">,
  id?: string
) => {
  const all = getRoles();
  if (id) {
    saveList(
      ROLES_KEY,
      all.map((item) => (item.id === id ? { ...item, ...payload } : item))
    );
    return;
  }
  saveList(ROLES_KEY, [
    {
      ...payload,
      id: generateId(),
      createdDate: new Date().toISOString(),
    },
    ...all,
  ]);
};
export const voidRole = (id: string) => {
  saveList(
    ROLES_KEY,
    getRoles().map((item) =>
      item.id === id ? { ...item, status: "inactive" as const } : item
    )
  );
};

export const getExpenseCategories = () =>
  parseList<ExpenseCategoryModel>(EXPENSE_CATEGORY_KEY);
export const saveExpenseCategory = (
  payload: Omit<ExpenseCategoryModel, "id" | "createdDate">,
  id?: string
) => {
  const all = getExpenseCategories();
  if (id) {
    saveList(
      EXPENSE_CATEGORY_KEY,
      all.map((item) => (item.id === id ? { ...item, ...payload } : item))
    );
    return;
  }
  saveList(EXPENSE_CATEGORY_KEY, [
    {
      ...payload,
      id: generateId(),
      createdDate: new Date().toISOString(),
    },
    ...all,
  ]);
};
