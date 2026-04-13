import {
  myFranchiseAreasSeed,
  myFranchiseCategoriesSeed,
  myFranchiseEmployeesSeed,
  myFranchiseServicesSeed,
} from "../mockData/myFranchiseMockData";

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
  pincode: string;
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

type MyFranchiseBoxData = {
  employees: EmployeeRow[];
  areas: AreaRow[];
  services: ServiceRow[];
  categories: CategoryRow[];
};

let mockEmployees: EmployeeRow[] = myFranchiseEmployeesSeed.map((item) => ({ ...item }));
let mockAreas: AreaRow[] = myFranchiseAreasSeed.map((item) => ({ ...item }));
let mockServices: ServiceRow[] = myFranchiseServicesSeed.map((item) => ({ ...item }));
let mockCategories: CategoryRow[] = myFranchiseCategoriesSeed.map((item) => ({ ...item }));

const USE_MOCK_MY_FRANCHISE_API = true;

export async function fetchMyFranchiseBoxData(): Promise<MyFranchiseBoxData> {
  if (USE_MOCK_MY_FRANCHISE_API) {
    return {
      employees: [...mockEmployees],
      areas: [...mockAreas],
      services: [...mockServices],
      categories: [...mockCategories],
    };
  }

  // Real mode endpoint not finalized yet; placeholder keeps interface stable.
  return {
    employees: [...mockEmployees],
    areas: [...mockAreas],
    services: [...mockServices],
    categories: [...mockCategories],
  };
}

export async function setEmployeeActive(id: string, is_active: boolean): Promise<boolean> {
  if (USE_MOCK_MY_FRANCHISE_API) {
    mockEmployees = mockEmployees.map((e) =>
      e._id === id
        ? {
            ...e,
            is_active,
            ...(!is_active ? { chat_enabled: false } : {}),
          }
        : e
    );
    return true;
  }
  return false;
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

export async function setAreaActive(id: string, is_active: boolean): Promise<boolean> {
  if (USE_MOCK_MY_FRANCHISE_API) {
    mockAreas = mockAreas.map((a) => (a._id === id ? { ...a, is_active } : a));
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

