import {
  myFranchiseAreasSeed,
  myFranchiseCategoriesSeed,
  myFranchiseEmployeesSeed,
  myFranchiseServicesSeed,
} from "../mockData/myFranchiseMockData";
import { myFranchiseRequestedServicesSeed } from "../mockData/myFranchiseRequestedServicesSeed";
import { myFranchiseRequestedCategoriesSeed } from "../mockData/myFranchiseRequestedCategoriesSeed";

// Keep shapes local to this service so UI doesn't import mock datasets.
export type EmployeeRow = {
  _id: string;
  employee_id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  area_name: string;
  is_active: boolean;
  /** Chat can be toggled only when `is_active`; inactive employees force this off. */
  chat_enabled?: boolean;
};

export type AreaRow = {
  _id: string;
  area_name: string;
  city_name: string;
  state_name: string;
  /** Single pincode or comma-separated (API / legacy). */
  pincode?: string;
  /** Multiple pincodes when API returns an array. */
  pincodes?: string[] | string;
  pin_codes?: string[] | string;
  is_active: boolean;
};

export type ServiceRow = {
  _id: string;
  service_id: string;
  name: string;
  category_name: string;
  is_active: boolean;
};

export type CategoryRow = {
  _id: string;
  category_id: string;
  name: string;
  is_active: boolean;
};

export type RequestedServiceRow = {
  _id: string;
  name: string;
  category_id: string;
  category_name: string;
  description: string;
  image_url?: string;
  status: "pending";
};

export type RequestedCategoryRow = {
  _id: string;
  name: string;
  service_ids: string[];
  service_names: string[];
  description: string;
  image_url?: string;
  status: "pending";
};

type MyFranchiseBoxData = {
  employees: EmployeeRow[];
  areas: AreaRow[];
  services: ServiceRow[];
  categories: CategoryRow[];
  requested_services: RequestedServiceRow[];
  requested_categories: RequestedCategoryRow[];
};

let mockEmployees: EmployeeRow[] = myFranchiseEmployeesSeed.map((item) => ({ ...item }));
let mockAreas: AreaRow[] = myFranchiseAreasSeed.map((item) => ({ ...item }));
let mockServices: ServiceRow[] = myFranchiseServicesSeed.map((item) => ({ ...item }));
let mockCategories: CategoryRow[] = myFranchiseCategoriesSeed.map((item) => ({ ...item }));
let mockRequestedServices: RequestedServiceRow[] = myFranchiseRequestedServicesSeed.map((item) => ({
  ...item,
}));
let mockRequestedCategories: RequestedCategoryRow[] = myFranchiseRequestedCategoriesSeed.map((item) => ({
  ...item,
}));

const USE_MOCK_MY_FRANCHISE_API = true;

function categoryNameById(categoryId: string): string {
  const c = mockCategories.find((x) => x.category_id === categoryId);
  return c?.name ?? categoryId;
}

function serviceNamesFromIds(serviceIds: string[]): string[] {
  return serviceIds
    .map((id) => {
      const s = mockServices.find((m) => m._id === id || m.service_id === id);
      return s?.name;
    })
    .filter(Boolean) as string[];
}

export async function fetchMyFranchiseBoxData(): Promise<MyFranchiseBoxData> {
  // When wiring a real API, branch on USE_MOCK_MY_FRANCHISE_API (or env) here.
  return {
    employees: [...mockEmployees],
    areas: [...mockAreas],
    services: [...mockServices],
    categories: [...mockCategories],
    requested_services: [...mockRequestedServices],
    requested_categories: [...mockRequestedCategories],
  };
}

export async function setEmployeeChatEnabled(id: string, chat_enabled: boolean): Promise<boolean> {
  if (USE_MOCK_MY_FRANCHISE_API) {
    mockEmployees = mockEmployees.map((e) =>
      e._id === id && e.is_active ? { ...e, chat_enabled } : e
    );
    return true;
  }
  return false;
}

export async function setServiceActive(id: string, is_active: boolean): Promise<boolean> {
  if (USE_MOCK_MY_FRANCHISE_API) {
    mockServices = mockServices.map((s) =>
      s._id === id ? { ...s, is_active } : s
    );
    return true;
  }
  return false;
}

export async function setCategoryActive(id: string, is_active: boolean): Promise<boolean> {
  if (USE_MOCK_MY_FRANCHISE_API) {
    mockCategories = mockCategories.map((c) =>
      c._id === id ? { ...c, is_active } : c
    );
    return true;
  }
  return false;
}

type FranchiseEmployeeInput = {
  name: string;
  phone: string;
  email: string;
  is_active: boolean;
  chat_enabled: boolean;
};

function nextEmployeeId(): string {
  let maxNum = 1000;
  for (const e of mockEmployees) {
    const m = /^FE-(\d+)$/i.exec(e.employee_id.trim());
    if (m) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n)) maxNum = Math.max(maxNum, n);
    }
  }
  return `FE-${maxNum + 1}`;
}

export async function createFranchiseEmployee(input: FranchiseEmployeeInput): Promise<boolean> {
  if (USE_MOCK_MY_FRANCHISE_API) {
    const row: EmployeeRow = {
      _id: `e${Date.now()}`,
      employee_id: nextEmployeeId(),
      name: input.name.trim(),
      role: "-",
      phone: input.phone.trim(),
      email: input.email.trim(),
      area_name: "-",
      is_active: input.is_active,
      chat_enabled: input.is_active ? input.chat_enabled : false,
    };
    mockEmployees = [...mockEmployees, row];
    return true;
  }
  return false;
}

export async function updateFranchiseEmployee(
  id: string,
  input: FranchiseEmployeeInput
): Promise<boolean> {
  if (USE_MOCK_MY_FRANCHISE_API) {
    mockEmployees = mockEmployees.map((e) =>
      e._id === id
        ? {
            ...e,
            name: input.name.trim(),
            phone: input.phone.trim(),
            email: input.email.trim(),
            is_active: input.is_active,
            chat_enabled: input.is_active ? input.chat_enabled : false,
          }
        : e
    );
    return true;
  }
  return false;
}

export async function voidFranchiseEmployee(id: string): Promise<boolean> {
  if (USE_MOCK_MY_FRANCHISE_API) {
    mockEmployees = mockEmployees.filter((e) => e._id !== id);
    return true;
  }
  return false;
}

export type RequestedServiceInput = {
  name: string;
  category_id: string;
  description: string;
  image_url?: string;
};

export async function createRequestedService(input: RequestedServiceInput): Promise<boolean> {
  if (USE_MOCK_MY_FRANCHISE_API) {
    const row: RequestedServiceRow = {
      _id: `rs${Date.now()}`,
      name: input.name.trim(),
      category_id: input.category_id,
      category_name: categoryNameById(input.category_id),
      description: input.description.trim(),
      image_url: input.image_url?.trim() || undefined,
      status: "pending",
    };
    mockRequestedServices = [...mockRequestedServices, row];
    return true;
  }
  return false;
}

export async function updateRequestedService(id: string, input: RequestedServiceInput): Promise<boolean> {
  if (USE_MOCK_MY_FRANCHISE_API) {
    mockRequestedServices = mockRequestedServices.map((r) =>
      r._id === id
        ? {
            ...r,
            name: input.name.trim(),
            category_id: input.category_id,
            category_name: categoryNameById(input.category_id),
            description: input.description.trim(),
            image_url: input.image_url?.trim() || undefined,
          }
        : r
    );
    return true;
  }
  return false;
}

export async function voidRequestedService(id: string): Promise<boolean> {
  if (USE_MOCK_MY_FRANCHISE_API) {
    mockRequestedServices = mockRequestedServices.filter((r) => r._id !== id);
    return true;
  }
  return false;
}

export type RequestedCategoryInput = {
  name: string;
  service_ids: string[];
  description: string;
  image_url?: string;
};

export async function createRequestedCategory(input: RequestedCategoryInput): Promise<boolean> {
  if (USE_MOCK_MY_FRANCHISE_API) {
    const ids = input.service_ids.map(String);
    const row: RequestedCategoryRow = {
      _id: `rc${Date.now()}`,
      name: input.name.trim(),
      service_ids: ids,
      service_names: serviceNamesFromIds(ids),
      description: input.description.trim(),
      image_url: input.image_url?.trim() || undefined,
      status: "pending",
    };
    mockRequestedCategories = [...mockRequestedCategories, row];
    return true;
  }
  return false;
}

export async function updateRequestedCategory(id: string, input: RequestedCategoryInput): Promise<boolean> {
  if (USE_MOCK_MY_FRANCHISE_API) {
    const ids = input.service_ids.map(String);
    mockRequestedCategories = mockRequestedCategories.map((r) =>
      r._id === id
        ? {
            ...r,
            name: input.name.trim(),
            service_ids: ids,
            service_names: serviceNamesFromIds(ids),
            description: input.description.trim(),
            image_url: input.image_url?.trim() || undefined,
          }
        : r
    );
    return true;
  }
  return false;
}

export async function voidRequestedCategory(id: string): Promise<boolean> {
  if (USE_MOCK_MY_FRANCHISE_API) {
    mockRequestedCategories = mockRequestedCategories.filter((r) => r._id !== id);
    return true;
  }
  return false;
}

