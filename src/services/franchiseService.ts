import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";
import { FranchiseModel } from "../models/FranchiseModels";
import { showLog } from "../helper/utility";
import { franchiseMockSeed } from "../mockData/franchiseMockData";
import type { ServerTableSortBy } from "../helper/serverTableSort";

const USE_MOCK_FRANCHISE_API = true;

export const fetchFranchiseDropDown = async (): Promise<{ value: string; label: string }[]> => {
  if (USE_MOCK_FRANCHISE_API) {
    return mockFranchises.map((f: any) => ({
      value: f._id,
      label: f.name,
    }));
  }

  const response = await apiRequest(
    `${ApiPaths.GET_FRANCHISE_DROP_DOWN()}`,
    "GET"
  );

  if (response.success) {
    return response.data.records.map((franchise: any) => ({
      value: franchise._id,
      label: franchise.name,
    }));
  } else {
    showLog(response.message || "Failed to fetch franchise");
    return [];
  }
};

export const fetchFranchise = async (
  page: number,
  pageSize: number,
  filters: { name?: string; status?: string; sort?: string },
  sortBy: ServerTableSortBy = []
): Promise<{ response: boolean; franchises: FranchiseModel[]; totalPages: number }> => {
  const primarySort = sortBy[0];
  if (USE_MOCK_FRANCHISE_API) {
    const keyword = (filters.name ?? "").trim().toLowerCase();
    const statusRaw = filters.status ?? "";
    const sortRaw = filters.sort ?? "";

    let data = [...mockFranchises];

    if (statusRaw && statusRaw !== "All") {
      const wantActive = statusRaw.toLowerCase() === "true";
      data = data.filter((item: any) => Boolean(item.is_active) === wantActive);
    }

    if (keyword) {
      data = data.filter((item: any) => {
        const areas = Array.isArray(item.area_name)
          ? item.area_name.join(" ")
          : String(item.area_name ?? "");
        const catSvc = [
          ...(Array.isArray(item.category_names) ? item.category_names : []),
          ...(Array.isArray(item.service_names) ? item.service_names : []),
        ]
          .join(" ")
          .toLowerCase();
        return (
          String(item.name ?? "").toLowerCase().includes(keyword) ||
          String(item.state_name ?? "").toLowerCase().includes(keyword) ||
          String(item.city_name ?? "").toLowerCase().includes(keyword) ||
          String(areas ?? "").toLowerCase().includes(keyword) ||
          String(item.admin_name ?? "").toLowerCase().includes(keyword) ||
          String(item.description ?? "").toLowerCase().includes(keyword) ||
          String(item.contact ?? "").toLowerCase().includes(keyword) ||
          catSvc.includes(keyword)
        );
      });
    }

    const sort = primarySort ? (primarySort.desc ? "desc" : "asc") : String(sortRaw).toLowerCase();
    if (sort) {
      const ascending = sort === "asc" || sort === "1";
      data.sort((a: any, b: any) => {
        const av = String(a.name ?? "");
        const bv = String(b.name ?? "");
        return ascending ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }

    const totalPages = Math.ceil(data.length / pageSize) || 0;
    const start = (page - 1) * pageSize;
    const records = data.slice(start, start + pageSize);

    return {
      response: true,
      franchises: records as FranchiseModel[],
      totalPages,
    };
  }

  const params = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
    ...(filters.name && { name: filters.name }),
    ...(filters.name && { keyword: filters.name }),
    ...(filters.status && filters.status !== "All" && { is_active: filters.status.toLowerCase() }),
    ...(filters.sort && { sort: filters.sort }),
    ...(primarySort?.id && { sort_by: primarySort.id }),
    ...(primarySort && { sort_order: primarySort.desc ? "desc" : "asc" }),
  });

  const response = await apiRequest(
    `${ApiPaths.GET_FRANCHISE()}?${params.toString()}`,
    "GET"
  );

  if (response.success) {
    return {
      response: true,
      franchises: response.data.records,
      totalPages: response.data.totalPages,
    };
  } else {
    showLog(response.message || "Failed to fetch franchise");
    return {
      response: false,
      franchises: [],
      totalPages: 0,
    };
  }
};

export const deleteFranchise = async (id: string): Promise<boolean> => {
  if (USE_MOCK_FRANCHISE_API) {
    const before = mockFranchises.length;
    mockFranchises = mockFranchises.filter((f: any) => String(f._id) !== String(id));
    return mockFranchises.length !== before;
  }

  const response = await apiRequest(ApiPaths.DELETE_FRANCHISE(id), "DELETE");

  if (response.success) {
    return true;
  } else {
    showLog(response.message || "Failed to delete franchise");
    return false;
  }
};

export const createOrUpdateFranchise = async (
  payload: any,
  isEditable: boolean,
  id?: string
): Promise<boolean> => {
  if (USE_MOCK_FRANCHISE_API) {
    if (isEditable) {
      const idx = mockFranchises.findIndex((f: any) => String(f._id) === String(id));
      if (idx === -1) return false;

      mockFranchises[idx] = {
        ...mockFranchises[idx],
        ...payload,
        _id: mockFranchises[idx]._id,
      };
      return true;
    }

    const newId = String(Date.now());
    mockFranchises = [
      {
        _id: newId,
        ...payload,
      },
      ...mockFranchises,
    ];
    return true;
  }

  const path = isEditable ? ApiPaths.UPDATE_FRANCHISE(id!) : ApiPaths.CREATE_FRANCHISE;
  const method = isEditable ? "PUT" : "POST";

  const response = await apiRequest(path, method, payload);

  if (response.success) {
    return true;
  }
  return false;
};

// ----------------------------
// Mock data + in-memory "store"
// ----------------------------

let mockFranchises: any[] = franchiseMockSeed.map((item) => ({ ...item }));