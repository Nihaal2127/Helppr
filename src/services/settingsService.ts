import {
  ExpenseCategoryModel,
  OfferModel,
  RoleSettingsModel,
} from "../models/SettingsModel";
import { offersMockSeed } from "../mockData/settingsOffersMockData";
import { rolesMockSeed } from "../mockData/settingsRolesMockData";
import { expenseCategoriesMockSeed } from "../mockData/settingsExpenseCategoryMockData";

const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

// ----------------------
// Offer mock data (in-memory, no localStorage)
// ----------------------

let mockOffers: OfferModel[] = offersMockSeed.map((item, index) => {
  const now = new Date().toISOString();
  return {
    ...item,
    id: `${Date.now()}-${index}`,
    createdAt: now,
    startDate: item.startDate || now,
    endDate: item.endDate || now,
  };
});

let mockRoles: RoleSettingsModel[] = rolesMockSeed.map((item, index) => {
  const now = new Date().toISOString();
  return {
    ...item,
    id: `${Date.now()}-role-${index}`,
    createdDate: now,
  };
});

let mockExpenseCategories: ExpenseCategoryModel[] = expenseCategoriesMockSeed.map(
  (item, index) => {
    const now = new Date().toISOString();
    return {
      ...item,
      id: `${Date.now()}-expense-category-${index}`,
      createdDate: now,
    };
  }
);

// Kept for backward compatibility with existing page calls.
export const ensureSettingsSeedData = () => {};

// Offers API (mock, in-memory)

export const getOffers = (): OfferModel[] => {
  return [...mockOffers];
};

export const saveOffer = (
  payload: Omit<OfferModel, "id" | "createdAt">,
  id?: string
) => {
  if (id) {
    mockOffers = mockOffers.map((item) =>
      item.id === id ? { ...item, ...payload } : item
    );
    return;
  }

  const now = new Date().toISOString();
  const newOffer: OfferModel = {
    ...payload,
    id: generateId(),
    createdAt: now,
    startDate: payload.startDate || now,
    endDate: payload.endDate || now,
  };

  mockOffers = [newOffer, ...mockOffers];
};

export const voidOffer = (id: string) => {
  mockOffers = mockOffers.map((item) =>
    item.id === id ? { ...item, status: "inactive" as const } : item
  );
};

export const getRoles = (): RoleSettingsModel[] => [...mockRoles];
export const saveRole = (
  payload: Omit<RoleSettingsModel, "id" | "createdDate">,
  id?: string
) => {
  if (id) {
    mockRoles = mockRoles.map((item) =>
      item.id === id ? { ...item, ...payload } : item
    );
    return;
  }

  mockRoles = [
    {
      ...payload,
      id: generateId(),
      createdDate: new Date().toISOString(),
    },
    ...mockRoles,
  ];
};
export const voidRole = (id: string) => {
  mockRoles = mockRoles.map((item) =>
    item.id === id ? { ...item, status: "inactive" as const } : item
  );
};

export const getExpenseCategories = (): ExpenseCategoryModel[] => [
  ...mockExpenseCategories,
];
export const saveExpenseCategory = (
  payload: Omit<ExpenseCategoryModel, "id" | "createdDate">,
  id?: string
) => {
  if (id) {
    mockExpenseCategories = mockExpenseCategories.map((item) =>
      item.id === id ? { ...item, ...payload } : item
    );
    return;
  }
  mockExpenseCategories = [
    {
      ...payload,
      id: generateId(),
      createdDate: new Date().toISOString(),
    },
    ...mockExpenseCategories,
  ];
};

export const voidExpenseCategory = (id: string) => {
  mockExpenseCategories = mockExpenseCategories.filter((item) => item.id !== id);
};
