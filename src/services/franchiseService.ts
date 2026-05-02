import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";
import { FranchiseModel } from "../models/FranchiseModels";
import { showLog } from "../helper/utility";
import { franchiseMockSeed } from "../mockData/franchiseMockData";
import type { ServerTableSortBy } from "../helper/serverTableSort";
import { AppConstant, UserRole } from "../constant/AppConstant";
import { getLocalStorage } from "../helper/localStorageHelper";

const USE_MOCK_FRANCHISE_API = false;

export type FranchiseDropDownOption = {
  value: string;
  label: string;
  state_id?: string;
  city_id?: string;
};

type AdminContact = { email?: string; phone_number?: string };

function mapAdminContactsById(rows: any[]): Map<string, AdminContact> {
  const out = new Map<string, AdminContact>();
  rows.forEach((u: any) => {
    const id = String(u?._id ?? u?.id ?? "").trim();
    if (!id) return;
    const email = String(u?.email ?? "").trim();
    const phone = String(u?.phone_number ?? u?.phone ?? "").trim();
    out.set(id, {
      ...(email ? { email } : {}),
      ...(phone ? { phone_number: phone } : {}),
    });
  });
  return out;
}

async function fetchAllFranchiseAdmins(): Promise<Map<string, AdminContact>> {
  const pageSize = 200;
  let page = 1;
  const all: any[] = [];
  for (;;) {
    // /user/getAll, only for enriching franchise table admin contact info
    // type=1 => franchise admin
    // eslint-disable-next-line no-await-in-loop
    const res = await apiRequest(
      `${ApiPaths.GET_USER()}?${new URLSearchParams({
        type: "1",
        page: String(page),
        limit: String(pageSize),
      }).toString()}`,
      "GET",
      undefined,
      false,
      true,
      true
    );
    if (!res.success) break;
    const payload = (res as any).data ?? {};
    const inner =
      payload && typeof payload.data === "object" && !Array.isArray(payload.data)
        ? payload.data
        : payload;
    const records = Array.isArray(inner.records)
      ? inner.records
      : Array.isArray(payload.records)
        ? payload.records
        : [];
    all.push(...records);
    const totalPages = Number(inner.totalPages ?? payload.totalPages ?? 0) || 0;
    if (!totalPages || page >= totalPages) break;
    page += 1;
    if (page > 100) break;
  }
  return mapAdminContactsById(all);
}

function toIdArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => String(x ?? "").trim()).filter(Boolean);
}

function mapFranchiseRow(raw: any, adminContacts?: Map<string, AdminContact>): FranchiseModel {
  const admin = raw?.admin && typeof raw.admin === "object" ? raw.admin : null;
  const adminInfo = raw?.admin_info && typeof raw.admin_info === "object" ? raw.admin_info : null;
  const adminId = String(raw?.admin_id ?? admin?._id ?? adminInfo?._id ?? "").trim();
  const fromAdminList = adminId ? adminContacts?.get(adminId) : undefined;
  const mappedEmail = String(
    raw?.email ??
      raw?.admin_email ??
      fromAdminList?.email ??
      admin?.email ??
      adminInfo?.email ??
      ""
  ).trim();
  const mappedPhone = String(
    raw?.phone_number ??
      raw?.phone ??
      raw?.admin_phone ??
      fromAdminList?.phone_number ??
      admin?.phone_number ??
      admin?.phone ??
      adminInfo?.phone_number ??
      adminInfo?.phone ??
      ""
  ).trim();

  const categoryIdsMerged = Array.from(
    new Set([...toIdArray(raw?.category_ids), ...toIdArray(raw?.categories)])
  );
  const serviceIdsMerged = Array.from(
    new Set([...toIdArray(raw?.service_ids), ...toIdArray(raw?.services)])
  );

  return {
    ...raw,
    email: mappedEmail || undefined,
    phone_number: mappedPhone || undefined,
    ...(categoryIdsMerged.length ? { category_ids: categoryIdsMerged } : {}),
    ...(serviceIdsMerged.length ? { service_ids: serviceIdsMerged } : {}),
  } as FranchiseModel;
}

export const fetchFranchiseDropDown = async (): Promise<FranchiseDropDownOption[]> => {
  const currentUserRole = String(getLocalStorage(AppConstant.userRole) ?? "").trim();
  if (
    currentUserRole === UserRole.FRANCHISE_ADMIN ||
    currentUserRole === UserRole.EMPLOYEE
  ) {
    return [];
  }

  if (USE_MOCK_FRANCHISE_API) {
    return mockFranchises.map((f: any) => ({
      value: f._id,
      label: f.name,
      state_id: f.state_id ? String(f.state_id) : undefined,
      city_id: f.city_id ? String(f.city_id) : undefined,
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
      state_id: franchise.state_id ? String(franchise.state_id) : undefined,
      city_id: franchise.city_id ? String(franchise.city_id) : undefined,
    }));
  } else {
    showLog(response.message || "Failed to fetch franchise");
    return [];
  }
};

/** Single franchise by id (GET /franchise/get/:id). Used when header filters to one franchise. */
export const fetchFranchiseById = async (id: string): Promise<FranchiseModel | null> => {
  const targetId = String(id ?? "").trim();
  if (!targetId) return null;
  if (USE_MOCK_FRANCHISE_API) {
    const raw = mockFranchises.find((f: any) => String(f._id) === targetId);
    if (!raw) return null;
    const adminContacts = await fetchAllFranchiseAdmins();
    return mapFranchiseRow(raw, adminContacts);
  }
  const response = await apiRequest(
    ApiPaths.GET_FRANCHISE_BY_ID(targetId),
    "GET",
    undefined,
    false,
    false,
    true
  );
  if (!response.success) return null;
  const payload = (response as any).data ?? {};
  const d =
    payload.data !== undefined && typeof payload.data === "object" && !Array.isArray(payload.data)
      ? payload.data
      : payload;
  const raw = d?.record ?? d?.franchise ?? (d && typeof d === "object" && d._id ? d : null);
  if (!raw || typeof raw !== "object") return null;
  const adminContacts = await fetchAllFranchiseAdmins();
  return mapFranchiseRow(raw, adminContacts);
};

export const fetchFranchise = async (
  page: number,
  pageSize: number,
  filters: {
    search?: string;
    name?: string;
    status?: string;
    sort?: string;
    sort_by?: string;
    sort_order?: "asc" | "desc";
    state_id?: string;
    city_id?: string;
    admin_id?: string;
    /** When set, list is scoped to this franchise (header dropdown). */
    franchise_id?: string;
  },
  sortBy: ServerTableSortBy = []
): Promise<{ response: boolean; franchises: FranchiseModel[]; totalPages: number; totalItems?: number }> => {
  const primarySort = sortBy[0];
  if (USE_MOCK_FRANCHISE_API) {
    const keyword = (filters.search ?? filters.name ?? "").trim().toLowerCase();
    const statusRaw = filters.status ?? "";
    const sortRaw = filters.sort ?? "";

    let data = [...mockFranchises];

    const fid = String(filters.franchise_id ?? "").trim();
    if (fid) {
      data = data.filter((item: any) => String(item._id ?? "") === fid);
    }

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

    const sort = primarySort
      ? (primarySort.desc ? "desc" : "asc")
      : String(filters.sort_order ?? sortRaw).toLowerCase();
    if (sort) {
      const ascending = sort === "asc" || sort === "1";
      const sortByField = primarySort?.id || filters.sort_by || "name";
      data.sort((a: any, b: any) => {
        const av = String(a?.[sortByField] ?? a?.name ?? "");
        const bv = String(b?.[sortByField] ?? b?.name ?? "");
        return ascending ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }

    const totalPages = Math.ceil(data.length / pageSize) || 0;
    const start = (page - 1) * pageSize;
    const adminContacts = await fetchAllFranchiseAdmins();
    const records = data.slice(start, start + pageSize).map((r) => mapFranchiseRow(r, adminContacts));

    return {
      response: true,
      franchises: records as FranchiseModel[],
      totalPages,
      totalItems: data.length,
    };
  }

  const searchValue = String(filters.search ?? filters.name ?? "").trim();
  const primarySortId = primarySort?.id ? String(primarySort.id).trim() : "";
  /** Column id from the table (matches API sort_by per franchise/getAll docs). */
  const sortByParam =
    primarySortId ||
    (filters.sort_by ? String(filters.sort_by).trim() : "");

  const params = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
    ...(searchValue && { search: searchValue }),
    ...(searchValue && { name: searchValue }),
    ...(filters.status && filters.status !== "All" && { is_active: filters.status.toLowerCase() }),
    ...(filters.state_id && { state_id: filters.state_id }),
    ...(filters.city_id && { city_id: filters.city_id }),
    ...(filters.admin_id && { admin_id: filters.admin_id }),
    ...(String(filters.franchise_id ?? "").trim() && {
      franchise_id: String(filters.franchise_id).trim(),
    }),
    ...(sortByParam && { sort_by: sortByParam }),
    ...(primarySort
      ? { sort_order: primarySort.desc ? "desc" : "asc" }
      : filters.sort_order
        ? { sort_order: filters.sort_order }
        : filters.sort
          ? { sort_order: filters.sort === "-1" ? "desc" : "asc" }
          : {}),
  });

  const response = await apiRequest(
    `${ApiPaths.GET_FRANCHISE()}?${params.toString()}`,
    "GET"
  );

  if (response.success) {
    const payload = response.data ?? {};
    const inner =
      payload && typeof payload.data === "object" && !Array.isArray(payload.data)
        ? payload.data
        : payload;
    const records = Array.isArray(inner.records)
      ? inner.records
      : Array.isArray(payload.records)
        ? payload.records
        : [];
    const totalPages = Number(inner.totalPages ?? payload.totalPages ?? 0) || 0;
    const totalItemsRaw = inner.totalItems ?? payload.totalItems ?? inner.totalCount ?? payload.totalCount;
    const totalItemsParsed =
      totalItemsRaw === undefined || totalItemsRaw === null || totalItemsRaw === ""
        ? undefined
        : Number(totalItemsRaw);
    const adminContacts = await fetchAllFranchiseAdmins();
    const fidFilter = String(filters.franchise_id ?? "").trim();
    let franchises = records.map((r: any) => mapFranchiseRow(r, adminContacts));
    if (fidFilter) {
      franchises = franchises.filter(
        (r: FranchiseModel) => String(r._id ?? "") === fidFilter
      );
      const totalItemsFiltered = franchises.length;
      const totalPagesFiltered =
        totalItemsFiltered === 0 ? 0 : Math.max(1, Math.ceil(totalItemsFiltered / pageSize));
      const start = (page - 1) * pageSize;
      franchises = franchises.slice(start, start + pageSize);
      return {
        response: true,
        franchises,
        totalPages: totalPagesFiltered,
        totalItems: totalItemsFiltered,
      };
    }
    return {
      response: true,
      franchises,
      totalPages,
      totalItems: totalItemsParsed !== undefined && !Number.isNaN(totalItemsParsed) ? totalItemsParsed : undefined,
    };
  } else {
    showLog(response.message || "Failed to fetch franchise");
    return {
      response: false,
      franchises: [],
      totalPages: 0,
      totalItems: 0,
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

function parseFranchiseIdFromMutationResponse(apiData: unknown): string | undefined {
  if (!apiData || typeof apiData !== "object") return undefined;
  const root = apiData as Record<string, unknown>;
  const nested =
    root.data && typeof root.data === "object" && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : root;
  const rec = (nested.record ?? nested.franchise ?? root.record) as Record<string, unknown> | undefined;
  if (rec && typeof rec === "object") {
    const rid = rec._id ?? rec.id;
    if (rid != null && String(rid).trim()) return String(rid).trim();
  }
  return undefined;
}

export type CreateOrUpdateFranchiseResult = { ok: boolean; franchiseId?: string };

export const createOrUpdateFranchise = async (
  payload: any,
  isEditable: boolean,
  id?: string
): Promise<CreateOrUpdateFranchiseResult> => {
  if (USE_MOCK_FRANCHISE_API) {
    if (isEditable) {
      const idx = mockFranchises.findIndex((f: any) => String(f._id) === String(id));
      if (idx === -1) return { ok: false };

      mockFranchises[idx] = {
        ...mockFranchises[idx],
        ...payload,
        _id: mockFranchises[idx]._id,
      };
      return { ok: true, franchiseId: String(mockFranchises[idx]._id) };
    }

    const newId = String(Date.now());
    mockFranchises = [
      {
        _id: newId,
        ...payload,
      },
      ...mockFranchises,
    ];
    return { ok: true, franchiseId: newId };
  }

  const path = isEditable ? ApiPaths.UPDATE_FRANCHISE(id!) : ApiPaths.CREATE_FRANCHISE;
  const method = isEditable ? "PUT" : "POST";

  const response = await apiRequest(path, method, payload);

  if (response.success) {
    const franchiseId = isEditable
      ? String(id ?? "").trim() || undefined
      : parseFranchiseIdFromMutationResponse(response.data);
    return { ok: true, franchiseId };
  }
  return { ok: false };
};

// ----------------------------
// Mock data + in-memory "store"
// ----------------------------

let mockFranchises: any[] = franchiseMockSeed.map((item) => ({ ...item }));