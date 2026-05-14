import { apiRequest } from "../remote/apiHelper";
import { showErrorAlert } from "../helper/alertHelper";
import { ApiPaths } from "../remote/apiPaths";
import type { PartnerSubscriptionModel } from "../pages/partnerManagement/subscriptionPlans/AddEditPartnerSubscriptionDialog";
import type { PostModel } from "../pages/partnerManagement/postManagement/AddEditPostManagementDialog";
import {
  partnerPortfoliosSeed,
  partnerPostsSeed,
  partnerSubscriptionsSeed,
} from "../mockData/partnerManagementMockData";
import { partnerSubscriptionPlansSeed } from "../mockData/partnerSubscriptionPlansSeedData";
import type { SubscriptionPlanModel } from "../models/SubscriptionPlanModel";
import type { ServerTableSortBy } from "../helper/serverTableSort";
import { capitalizeString } from "../helper/utility";
import { sessionMayUseFranchiseIdApiFilter } from "../helper/headerFranchisePreference";

export type PortfolioRow = {
  _id: string;
  partner_id: string;
  partner_name: string;
  category: string;
  service: string;
  total_posts: string;
  total_images: string;
  total_videos: string;
  likes_count: string;
  comments_count: string;
  saves_count: string;
  ratings: string;
  location: string;
  is_active: boolean;
};

type ListStats = { Total: number; Active: number; Inactive: number };

const USE_MOCK_PARTNER_MANAGEMENT_API = true;

/**
 * Partner Subscription List only (`subscriptionPlans.tsx` partner tab).
 * `false` → Postman `/partner-subscription/*`. `true` → in-memory seed (unchanged).
 * Does not affect portfolio/post mocks (`USE_MOCK_PARTNER_MANAGEMENT_API`).
 */
export const USE_MOCK_PARTNER_SUBSCRIPTIONS_API = false;

let mockPartnerSubscriptions: PartnerSubscriptionModel[] =
  partnerSubscriptionsSeed.map((item) => ({ ...item }));
let mockPortfolios: PortfolioRow[] = partnerPortfoliosSeed.map((item) => ({
  ...item,
}));
let mockPosts: PostModel[] = partnerPostsSeed.map((item) => ({ ...item }));
let mockSubscriptionPlans: SubscriptionPlanModel[] =
  partnerSubscriptionPlansSeed.map((item) => ({ ...item }));

/** When `true`, subscription plan catalog uses seed data; when `false`, calls `/subscription-plan/*` APIs. */
export const USE_MOCK_SUBSCRIPTION_PLAN_API = false;

function statsFor(list: Array<{ is_active: boolean }>): ListStats {
  const total = list.length;
  const active = list.filter((x) => x.is_active).length;
  return { Total: total, Active: active, Inactive: total - active };
}

function paginate<T>(
  rows: T[],
  page: number,
  limit: number
): { records: T[]; totalPages: number } {
  const totalPages = rows.length ? Math.ceil(rows.length / limit) : 0;
  const start = Math.max(0, (page - 1) * limit);
  return { records: rows.slice(start, start + limit), totalPages };
}

function parseSubscriptionPlanRecord(
  raw: Record<string, unknown>
): SubscriptionPlanModel {
  const id = raw._id ?? raw.id;
  return {
    _id: id != null ? String(id) : "",
    plan_name: String(raw.plan_name ?? "").toLowerCase(),
    plan_description: String(raw.plan_description ?? ""),
    price: raw.price != null && raw.price !== "" ? String(raw.price) : "",
    duration:
      raw.duration != null && raw.duration !== "" ? String(raw.duration) : "",
    duration_type: String(raw.duration_type ?? ""),
    priority:
      raw.priority != null && raw.priority !== "" ? String(raw.priority) : "",
    is_active: Boolean(raw.is_active),
  };
}

function pickSubscriptionPlanListRoot(
  d: Record<string, unknown>
): Record<string, unknown> {
  const inner = d.data;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    return inner as Record<string, unknown>;
  }
  return d;
}

function subscriptionPlanListStatsFromResponse(
  root: Record<string, unknown>,
  records: SubscriptionPlanModel[]
): ListStats {
  const st = root.stats as ListStats | undefined;
  if (st && typeof st.Total === "number") return st;

  const total = Number(
    root.total ?? root.totalDocs ?? root.total_count ?? root.count
  );
  const activeN = Number(
    root.active_count ?? root.activeCount ?? root.active_total
  );
  const inactiveN = Number(
    root.inactive_count ?? root.inactiveCount ?? root.inactive_total
  );
  if (
    Number.isFinite(total) &&
    Number.isFinite(activeN) &&
    Number.isFinite(inactiveN)
  ) {
    return { Total: total, Active: activeN, Inactive: inactiveN };
  }
  if (Number.isFinite(total) && Number.isFinite(activeN)) {
    return {
      Total: total,
      Active: activeN,
      Inactive: Math.max(0, total - activeN),
    };
  }
  return statsFor(records);
}

function buildSubscriptionPlanCreateBody(
  plan: SubscriptionPlanModel
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    plan_name: String(plan.plan_name ?? "")
      .trim()
      .toLowerCase(),
    plan_description: String(plan.plan_description ?? "").trim(),
    price: Number(String(plan.price ?? "").replace(/,/g, "")) || 0,
    duration: Number(String(plan.duration ?? "").replace(/,/g, "")) || 0,
    duration_type: String(plan.duration_type ?? "")
      .trim()
      .toLowerCase(),
    is_active: Boolean(plan.is_active),
  };
  const pr = plan.priority != null && String(plan.priority).trim() !== "";
  if (pr) body.priority = Number(String(plan.priority).replace(/,/g, "")) || 0;
  return body;
}

function buildSubscriptionPlanUpdateBody(
  plan: SubscriptionPlanModel
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    plan_description: String(plan.plan_description ?? "").trim(),
    price: Number(String(plan.price ?? "").replace(/,/g, "")) || 0,
    duration: Number(String(plan.duration ?? "").replace(/,/g, "")) || 0,
    duration_type: String(plan.duration_type ?? "")
      .trim()
      .toLowerCase(),
    is_active: Boolean(plan.is_active),
  };
  const pr = plan.priority != null && String(plan.priority).trim() !== "";
  if (pr) body.priority = Number(String(plan.priority).replace(/,/g, "")) || 0;
  return body;
}

export async function fetchSubscriptionPlans(
  page: number,
  limit: number,
  filters: { name?: string; status?: string; sort?: string },
  sortBy: ServerTableSortBy = []
): Promise<{
  response: boolean;
  records: SubscriptionPlanModel[];
  totalPages: number;
  stats: ListStats;
}> {
  const primarySort = sortBy[0];
  if (USE_MOCK_SUBSCRIPTION_PLAN_API) {
    const keyword = (filters.name ?? "").trim().toLowerCase();
    const statusRaw = (filters.status ?? "").toLowerCase();
    const sortRaw = primarySort
      ? primarySort.desc
        ? "desc"
        : "asc"
      : String(filters.sort ?? "").toLowerCase();

    let data = [...mockSubscriptionPlans];
    if (statusRaw === "true") data = data.filter((x) => x.is_active);
    if (statusRaw === "false") data = data.filter((x) => !x.is_active);

    if (keyword) {
      data = data.filter((p) => {
        const hay = [
          p.plan_name,
          p.plan_description,
          p.price,
          p.duration,
          p.duration_type,
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(keyword);
      });
    }

    if (sortRaw) {
      const ascending = sortRaw === "asc" || sortRaw === "1";
      data.sort((a, b) =>
        ascending
          ? (a.plan_name || "").localeCompare(b.plan_name || "")
          : (b.plan_name || "").localeCompare(a.plan_name || "")
      );
    }

    const { records, totalPages } = paginate(data, page, limit);
    return {
      response: true,
      records,
      totalPages,
      stats: statsFor(mockSubscriptionPlans),
    };
  }

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const nameTrim = (filters.name ?? "").trim();
  if (nameTrim) {
    params.set("name", nameTrim);
    params.set("keyword", nameTrim);
    const lower = nameTrim.toLowerCase();
    if (["basic", "silver", "gold", "platinum"].includes(lower)) {
      params.set("plan_name", lower);
    }
  }
  if (filters.status && filters.status !== "all") {
    const s = filters.status.toLowerCase();
    if (s === "active") params.set("is_active", "true");
    else if (s === "inactive" || s === "expired")
      params.set("is_active", "false");
    else if (s === "true" || s === "false") params.set("is_active", s);
  }
  if (filters.sort) params.set("sort", filters.sort);
  if (primarySort?.id) {
    params.set("sort_by", primarySort.id);
    params.set("sort_order", primarySort.desc ? "desc" : "asc");
  }

  const res = await apiRequest(
    `${ApiPaths.SUBSCRIPTION_PLAN_GET_ALL()}?${params.toString()}`,
    "GET"
  );
  if (!res.success) {
    return {
      response: false,
      records: [],
      totalPages: 0,
      stats: { Total: 0, Active: 0, Inactive: 0 },
    };
  }

  const root = pickSubscriptionPlanListRoot(
    (res.data ?? {}) as Record<string, unknown>
  );
  const rawList = (root.records ?? root.list ?? []) as Record<
    string,
    unknown
  >[];
  const records = Array.isArray(rawList)
    ? rawList.map((r) => parseSubscriptionPlanRecord(r))
    : [];
  const totalPages = Number(root.totalPages ?? root.total_pages ?? 0) || 0;
  const stats = subscriptionPlanListStatsFromResponse(root, records);

  return { response: true, records, totalPages, stats };
}

export async function voidSubscriptionPlan(id: string): Promise<boolean> {
  if (USE_MOCK_SUBSCRIPTION_PLAN_API) {
    mockSubscriptionPlans = mockSubscriptionPlans.map((p) =>
      p._id === id ? { ...p, is_active: false } : p
    );
    return true;
  }
  const res = await apiRequest(ApiPaths.SUBSCRIPTION_PLAN_DELETE(id), "DELETE");
  return Boolean(res.success);
}

export async function saveSubscriptionPlan(
  plan: SubscriptionPlanModel,
  isUpdate: boolean
): Promise<boolean> {
  if (USE_MOCK_SUBSCRIPTION_PLAN_API) {
    if (isUpdate) {
      mockSubscriptionPlans = mockSubscriptionPlans.map((p) =>
        p._id === plan._id ? { ...p, ...plan } : p
      );
      return true;
    }
    const nextId = `PLN${String(Date.now()).slice(-6)}`;
    mockSubscriptionPlans = [
      { ...plan, _id: nextId },
      ...mockSubscriptionPlans,
    ];
    return true;
  }

  if (isUpdate) {
    if (!plan._id) return false;
    const res = await apiRequest(
      ApiPaths.SUBSCRIPTION_PLAN_UPDATE(plan._id),
      "PUT",
      buildSubscriptionPlanUpdateBody(plan)
    );
    return Boolean(res.success);
  }
  const res = await apiRequest(
    ApiPaths.SUBSCRIPTION_PLAN_CREATE,
    "POST",
    buildSubscriptionPlanCreateBody(plan)
  );
  return Boolean(res.success);
}

export async function fetchSubscriptionPlanDropDown(): Promise<
  { value: string; label: string }[]
> {
  if (USE_MOCK_SUBSCRIPTION_PLAN_API) {
    return partnerSubscriptionPlansSeed
      .filter((p) => p.is_active)
      .map((p) => ({
        value: p.plan_name,
        label: capitalizeString(p.plan_name),
      }));
  }

  const res = await apiRequest(
    ApiPaths.SUBSCRIPTION_PLAN_GET_DROP_DOWN(),
    "GET"
  );
  if (!res.success) return [];

  const root = pickSubscriptionPlanListRoot(
    (res.data ?? {}) as Record<string, unknown>
  );
  const rawList = (root.records ??
    root.list ??
    res.data?.records ??
    []) as Record<string, unknown>[];
  if (!Array.isArray(rawList)) return [];

  const out: { value: string; label: string }[] = [];
  for (const r of rawList) {
    const name = String(r.plan_name ?? "")
      .trim()
      .toLowerCase();
    if (!name) continue;
    if (r.is_active === false) continue;
    const id =
      r._id != null && String(r._id).trim() !== "" ? String(r._id) : "";
    out.push({ value: id || name, label: capitalizeString(name) });
  }
  return out;
}

function pickPartnerSubListRoot(
  d: Record<string, unknown>
): Record<string, unknown> {
  const inner = d.data;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    return inner as Record<string, unknown>;
  }
  return d;
}

function mapPartnerSubscriptionApiRecord(
  raw: Record<string, unknown>
): PartnerSubscriptionModel {
  const id = String(
    raw._id ??
      raw.id ??
      raw.subscription_id ??
      raw.partner_subscription_id ??
      ""
  ).trim();

  let partnerId = "";
  let partnerName = String(raw.partner_name ?? "");
  const pid = raw.partner_id;
  if (typeof pid === "string") {
    partnerId = pid;
  } else if (pid && typeof pid === "object") {
    const po = pid as Record<string, unknown>;
    partnerId = String(po._id ?? po.id ?? "");
    partnerName = partnerName || String(po.name ?? po.partner_name ?? "");
  }

  let planId = "";
  let planName = "";
  const spRef = raw.subscription_plan;
  const spIdField = raw.subscription_plan_id;
  if (typeof spIdField === "string" && spIdField.trim()) {
    planId = spIdField.trim();
  } else if (spIdField && typeof spIdField === "object") {
    const p = spIdField as Record<string, unknown>;
    planId = String(p._id ?? p.id ?? "");
    planName = String(p.plan_name ?? "").toLowerCase();
  } else if (typeof spRef === "string") {
    planName = spRef.toLowerCase();
  } else if (spRef && typeof spRef === "object") {
    const p = spRef as Record<string, unknown>;
    planId = planId || String(p._id ?? p.id ?? "");
    planName = String(p.plan_name ?? "").toLowerCase();
  }

  const start = String(
    raw.started_at ?? raw.subscription_start_date ?? raw.start_date ?? ""
  ).slice(0, 10);
  const end = String(
    raw.expires_at ?? raw.subscription_end_date ?? raw.end_date ?? ""
  ).slice(0, 10);
  const statusStr = String(raw.status ?? "").toLowerCase();
  const isActive = statusStr === "active" || raw.is_active === true;

  return {
    _id: id,
    partner_id: partnerId,
    partner_name: partnerName,
    subscription_plan: planName,
    subscription_plan_id: planId,
    subscription_start_date: start,
    subscription_end_date: end,
    rating: String(raw.rating ?? ""),
    location: String(raw.location ?? ""),
    address: String(raw.address ?? ""),
    banner_image: String(raw.banner_image ?? ""),
    is_active: isActive,
    notes: String(raw.notes ?? ""),
  };
}

/** Maps react-table column ids to `GET …/partner-subscription/getAll` `sort_by` values. */
function mapPartnerSubscriptionSortField(columnId: string): string {
  const id = String(columnId ?? "").trim();
  const map: Record<string, string> = {
    partner_name: "partner_name",
    subscription_plan: "subscription_plan",
    subscription_start_date: "subscription_start_date",
    subscription_end_date: "subscription_end_date",
    is_active: "is_active",
  };
  return map[id] ?? id;
}

function resolvePartnerSubscriptionTotalPages(
  root: Record<string, unknown>,
  limit: number,
  recordCount: number
): number {
  const explicit = Number(root.totalPages ?? root.total_pages ?? 0);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;

  const total = Number(
    root.total ?? root.totalDocs ?? root.total_count ?? root.count ?? 0
  );
  if (Number.isFinite(total) && total > 0 && limit > 0) {
    return Math.max(1, Math.ceil(total / limit));
  }
  if (recordCount > 0 && limit > 0) return 1;
  return 0;
}

function comparePartnerSubscriptionsMock(
  a: PartnerSubscriptionModel,
  b: PartnerSubscriptionModel,
  columnId: string,
  desc: boolean
): number {
  const mul = desc ? -1 : 1;
  const val = (p: PartnerSubscriptionModel, id: string): string | number => {
    switch (id) {
      case "partner_name":
        return (p.partner_name || "").toLowerCase();
      case "subscription_plan":
        return (p.subscription_plan || "").toLowerCase();
      case "subscription_start_date":
        return String(p.subscription_start_date ?? "");
      case "subscription_end_date":
        return String(p.subscription_end_date ?? "");
      case "is_active":
        return p.is_active ? 1 : 0;
      default:
        return (p.partner_name || "").toLowerCase();
    }
  };
  const av = val(a, columnId);
  const bv = val(b, columnId);
  if (av < bv) return -1 * mul;
  if (av > bv) return 1 * mul;
  return 0;
}

function partnerSubListStatsFromResponse(
  root: Record<string, unknown>,
  records: PartnerSubscriptionModel[]
): ListStats {
  const st = root.stats as ListStats | undefined;
  if (st && typeof st.Total === "number") return st;
  const total = Number(
    root.total ?? root.totalDocs ?? root.total_count ?? root.count
  );
  const activeN = Number(root.active_count ?? root.activeCount);
  const inactiveN = Number(root.inactive_count ?? root.inactiveCount);
  if (
    Number.isFinite(total) &&
    Number.isFinite(activeN) &&
    Number.isFinite(inactiveN)
  ) {
    return { Total: total, Active: activeN, Inactive: inactiveN };
  }
  if (Number.isFinite(total) && Number.isFinite(activeN)) {
    return {
      Total: total,
      Active: activeN,
      Inactive: Math.max(0, total - activeN),
    };
  }
  return statsFor(records);
}

export async function fetchPartnerSubscriptions(
  page: number,
  limit: number,
  filters: {
    name?: string;
    status?: string;
    sort?: string;
    planType?: string;
    /** UI passes Area _id (`fetchAreaDropDown`) or "all". */
    location?: string;
    fromDate?: string;
    toDate?: string;
    /** Optional server-side scoping when supported by backend. */
    cityId?: string;
    franchiseId?: string;
  },
  sortBy: ServerTableSortBy = []
): Promise<{
  response: boolean;
  records: PartnerSubscriptionModel[];
  totalPages: number;
  stats: ListStats;
}> {
  const primarySort = sortBy[0];
  if (USE_MOCK_PARTNER_SUBSCRIPTIONS_API) {
    const keyword = (filters.name ?? "").trim().toLowerCase();
    const statusRaw = (filters.status ?? "").toLowerCase();
    const sortRaw = primarySort
      ? primarySort.desc
        ? "desc"
        : "asc"
      : String(filters.sort ?? "").toLowerCase();

    let data = [...mockPartnerSubscriptions];
    if (statusRaw === "true" || statusRaw === "active")
      data = data.filter((x) => x.is_active);
    if (
      statusRaw === "false" ||
      statusRaw === "inactive" ||
      statusRaw === "expired"
    ) {
      data = data.filter((x) => !x.is_active);
    }

    if (keyword) {
      data = data.filter((p) => {
        const hay = [
          p.partner_name,
          p.partner_id,
          p.subscription_plan,
          p.address ?? p.location,
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(keyword);
      });
    }

    const planTypeRaw = (filters.planType ?? "").toLowerCase();
    if (planTypeRaw && planTypeRaw !== "all") {
      data = data.filter(
        (p) => (p.subscription_plan || "").toLowerCase() === planTypeRaw
      );
    }

    const locationRaw = (filters.location ?? "").toLowerCase();
    if (locationRaw && locationRaw !== "all") {
      data = data.filter((p) =>
        (p.address ?? p.location ?? "").toLowerCase().includes(locationRaw)
      );
    }

    const fromDateRaw = (filters.fromDate ?? "").trim();
    const toDateRaw = (filters.toDate ?? "").trim();
    if (fromDateRaw || toDateRaw) {
      const dayStart = (s: string) => {
        const d = String(s).trim().slice(0, 10);
        const [y, m, day] = d.split("-").map((x) => Number(x));
        if (!y || !m || !day) return null;
        return new Date(y, m - 1, day, 0, 0, 0, 0).getTime();
      };
      const dayEnd = (s: string) => {
        const d = String(s).trim().slice(0, 10);
        const [y, m, day] = d.split("-").map((x) => Number(x));
        if (!y || !m || !day) return null;
        return new Date(y, m - 1, day, 23, 59, 59, 999).getTime();
      };
      const fromTs = fromDateRaw ? dayStart(fromDateRaw) : null;
      const toTs = toDateRaw ? dayEnd(toDateRaw) : null;
      data = data.filter((p) => {
        const startStr = String(p.subscription_start_date ?? "").slice(0, 10);
        const startTs = dayStart(startStr);
        if (startTs == null || !Number.isFinite(startTs)) return false;
        const afterFrom = fromTs === null || startTs >= fromTs;
        const beforeTo = toTs === null || startTs <= toTs;
        return afterFrom && beforeTo;
      });
    }

    if (primarySort?.id) {
      const sid = primarySort.id;
      data.sort((a, b) =>
        comparePartnerSubscriptionsMock(a, b, sid, primarySort.desc)
      );
    } else if (sortRaw) {
      const ascending = sortRaw === "asc" || sortRaw === "1";
      data.sort((a, b) =>
        ascending
          ? (a.partner_name || "").localeCompare(b.partner_name || "")
          : (b.partner_name || "").localeCompare(a.partner_name || "")
      );
    }

    const { records, totalPages } = paginate(data, page, limit);
    return {
      response: true,
      records,
      totalPages,
      stats: statsFor(mockPartnerSubscriptions as any),
    };
  }

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const statusLower = (filters.status ?? "").toLowerCase();
  if (statusLower && statusLower !== "all") {
    if (statusLower === "active" || statusLower === "true")
      params.set("status", "active");
    else if (statusLower === "inactive" || statusLower === "false")
      params.set("status", "cancelled");
    else if (statusLower === "expired") params.set("status", "expired");
    else params.set("status", statusLower);
  }
  const nameKw = (filters.name ?? "").trim();
  if (nameKw) {
    /** Postman: `search` = partner name substring; also accepts `partner_name`. */
    params.set("search", nameKw);
    params.set("partner_name", nameKw);
  }
  const planT = (filters.planType ?? "").trim();
  if (planT && planT !== "all") {
    if (/^[a-f\d]{24}$/i.test(planT)) {
      params.set("subscription_plan_id", planT);
    } else {
      const slug = planT.trim().toLowerCase();
      if (["basic", "silver", "gold", "platinum"].includes(slug)) {
        params.set("plan_name", slug);
        params.set("subscription_plan", slug);
      }
    }
  }
  const areaId = (filters.location ?? "").trim();
  if (areaId && areaId !== "all" && /^[a-f\d]{24}$/i.test(areaId)) {
    params.set("area_id", areaId);
  }
  const fromDate = (filters.fromDate ?? "").trim().slice(0, 10);
  const toDate = (filters.toDate ?? "").trim().slice(0, 10);
  /** Postman: `from_date` / `to_date` on `started_at` (from only, to only, or range). */
  if (fromDate) params.set("from_date", fromDate);
  if (toDate) params.set("to_date", toDate);
  const cityId = (filters.cityId ?? "").trim();
  if (cityId && /^[a-f\d]{24}$/i.test(cityId)) {
    params.set("city_id", cityId);
  }
  const franchiseId = (filters.franchiseId ?? "").trim();
  if (
    sessionMayUseFranchiseIdApiFilter() &&
    franchiseId &&
    /^[a-f\d]{24}$/i.test(franchiseId)
  ) {
    params.set("franchise_id", franchiseId);
  }
  if (filters.sort) params.set("sort", filters.sort);
  if (primarySort?.id) {
    params.set("sort_by", mapPartnerSubscriptionSortField(primarySort.id));
    params.set("sort_order", primarySort.desc ? "desc" : "asc");
  }

  const res = await apiRequest(
    `${ApiPaths.PARTNER_SUBSCRIPTION_GET_ALL()}?${params.toString()}`,
    "GET"
  );
  if (!res.success)
    return {
      response: false,
      records: [],
      totalPages: 0,
      stats: { Total: 0, Active: 0, Inactive: 0 },
    };
  const root = pickPartnerSubListRoot(
    (res.data ?? {}) as Record<string, unknown>
  );
  const rawList = (root.records ?? root.list ?? []) as Record<
    string,
    unknown
  >[];
  const records = Array.isArray(rawList)
    ? rawList.map((r) => mapPartnerSubscriptionApiRecord(r))
    : [];

  const totalPages = resolvePartnerSubscriptionTotalPages(
    root,
    limit,
    records.length
  );
  const stats = partnerSubListStatsFromResponse(root, records);
  return { response: true, records, totalPages, stats };
}

export async function voidPartnerSubscription(id: string): Promise<boolean> {
  if (USE_MOCK_PARTNER_SUBSCRIPTIONS_API) {
    mockPartnerSubscriptions = mockPartnerSubscriptions.map((p) =>
      String(p._id) === String(id) ? { ...p, is_active: false } : p
    );
    return true;
  }
  const res = await apiRequest(
    ApiPaths.PARTNER_SUBSCRIPTION_DELETE(id),
    "DELETE"
  );
  return Boolean(res.success);
}

/**
 * Persists a partner subscription. Update vs create is determined only by `sub._id`
 * (Postman: `PUT /partner-subscription/update/:id` vs `POST /partner-subscription/create`).
 */
export async function savePartnerSubscription(
  sub: PartnerSubscriptionModel
): Promise<boolean> {
  const updateExisting = Boolean(String(sub._id ?? "").trim());

  if (USE_MOCK_PARTNER_SUBSCRIPTIONS_API) {
    if (updateExisting) {
      mockPartnerSubscriptions = mockPartnerSubscriptions.map((p) =>
        String(p._id) === String(sub._id) ? { ...p, ...sub } : p
      );
      return true;
    }
    const nextId = String(Date.now());
    mockPartnerSubscriptions = [
      { ...sub, _id: nextId },
      ...mockPartnerSubscriptions,
    ];
    return true;
  }

  if (updateExisting) {
    if (!String(sub._id ?? "").trim()) {
      showErrorAlert("Missing subscription id; cannot update this record.");
      return false;
    }
    const body: Record<string, unknown> = {
      status: sub.is_active ? "active" : "cancelled",
    };
    const notes = (sub.notes ?? "").trim();
    if (notes) body.notes = notes;
    if (sub.subscription_start_date?.trim())
      body.started_at = sub.subscription_start_date.trim();
    if (sub.subscription_end_date?.trim())
      body.expires_at = sub.subscription_end_date.trim();
    const pid = (sub.subscription_plan_id ?? "").trim();
    if (pid && /^[a-f\d]{24}$/i.test(pid)) {
      body.subscription_plan_id = pid;
    }
    const res = await apiRequest(
      ApiPaths.PARTNER_SUBSCRIPTION_UPDATE(String(sub._id)),
      "PUT",
      body
    );
    return Boolean(res.success);
  }

  const planId = (
    sub.subscription_plan_id ||
    sub.subscription_plan ||
    ""
  ).trim();
  const partnerId = (sub.partner_id || "").trim();
  if (!partnerId || !planId) {
    showErrorAlert("Partner and subscription plan are required before saving.");
    return false;
  }
  const createBody: Record<string, unknown> = {
    partner_id: partnerId,
    subscription_plan_id: planId,
  };
  const n = (sub.notes ?? "").trim();
  if (n) createBody.notes = n;
  if (sub.subscription_start_date?.trim())
    createBody.started_at = sub.subscription_start_date.trim();
  if (sub.subscription_end_date?.trim())
    createBody.expires_at = sub.subscription_end_date.trim();
  const res = await apiRequest(
    ApiPaths.PARTNER_SUBSCRIPTION_CREATE,
    "POST",
    createBody
  );
  return Boolean(res.success);
}

export async function fetchPortfolios(
  page: number,
  limit: number,
  filters: {
    name?: string;
    status?: string;
    sort?: string;
    category?: string;
    service?: string;
    location?: string;
  },
  sortBy: ServerTableSortBy = []
): Promise<{
  response: boolean;
  records: PortfolioRow[];
  totalPages: number;
  stats: ListStats;
}> {
  const primarySort = sortBy[0];
  if (USE_MOCK_PARTNER_MANAGEMENT_API) {
    const keyword = (filters.name ?? "").trim().toLowerCase();
    const statusRaw = (filters.status ?? "").toLowerCase();
    const sortRaw = primarySort
      ? primarySort.desc
        ? "desc"
        : "asc"
      : String(filters.sort ?? "").toLowerCase();
    const categoryRaw = (filters.category ?? "").toLowerCase();
    const serviceRaw = (filters.service ?? "").toLowerCase();
    const locationRaw = (filters.location ?? "").toLowerCase();

    let data = [...mockPortfolios];
    if (statusRaw === "true" || statusRaw === "active")
      data = data.filter((x) => x.is_active);
    if (statusRaw === "false" || statusRaw === "inactive")
      data = data.filter((x) => !x.is_active);

    if (keyword) {
      data = data.filter((p) => {
        const hay = [
          p.partner_name,
          p.partner_id,
          p.category,
          p.service,
          p.location,
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(keyword);
      });
    }
    if (categoryRaw && categoryRaw !== "all") {
      data = data.filter((p) =>
        (p.category || "").toLowerCase().includes(categoryRaw)
      );
    }
    if (serviceRaw && serviceRaw !== "all") {
      data = data.filter((p) =>
        (p.service || "").toLowerCase().includes(serviceRaw)
      );
    }
    if (locationRaw && locationRaw !== "all") {
      data = data.filter((p) =>
        (p.location || "").toLowerCase().includes(locationRaw)
      );
    }

    if (sortRaw) {
      const ascending = sortRaw === "asc" || sortRaw === "1";
      data.sort((a, b) =>
        ascending
          ? a.partner_name.localeCompare(b.partner_name)
          : b.partner_name.localeCompare(a.partner_name)
      );
    }

    const { records, totalPages } = paginate(data, page, limit);
    return {
      response: true,
      records,
      totalPages,
      stats: statsFor(mockPortfolios),
    };
  }

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(filters.name ? { name: filters.name } : {}),
    ...(filters.name ? { keyword: filters.name } : {}),
    ...(filters.status && filters.status !== "All"
      ? { is_active: filters.status.toLowerCase() }
      : {}),
    ...(filters.sort ? { sort: filters.sort } : {}),
    ...(primarySort?.id ? { sort_by: primarySort.id } : {}),
    ...(primarySort ? { sort_order: primarySort.desc ? "desc" : "asc" } : {}),
    ...(filters.category && filters.category !== "all"
      ? { category: filters.category }
      : {}),
    ...(filters.service && filters.service !== "all"
      ? { service: filters.service }
      : {}),
    ...(filters.location && filters.location !== "all"
      ? { location: filters.location }
      : {}),
  });
  const res = await apiRequest(
    `${ApiPaths.GET_PARTNER_PORTFOLIOS()}?${params.toString()}`,
    "GET"
  );
  if (!res.success)
    return {
      response: false,
      records: [],
      totalPages: 0,
      stats: { Total: 0, Active: 0, Inactive: 0 },
    };
  const d = res.data ?? {};
  return {
    response: true,
    records: d.records ?? d.data?.records ?? [],
    totalPages: d.totalPages ?? d.data?.totalPages ?? 0,
    stats: d.stats ?? d.data?.stats ?? { Total: 0, Active: 0, Inactive: 0 },
  };
}

export async function voidPortfolio(id: string): Promise<boolean> {
  if (USE_MOCK_PARTNER_MANAGEMENT_API) {
    mockPortfolios = mockPortfolios.map((p) =>
      p._id === id ? { ...p, is_active: false } : p
    );
    return true;
  }
  const res = await apiRequest(ApiPaths.VOID_PARTNER_PORTFOLIO(id), "PUT");
  return Boolean(res.success);
}

export async function fetchPosts(): Promise<{
  response: boolean;
  records: PostModel[];
}> {
  if (USE_MOCK_PARTNER_MANAGEMENT_API) {
    return { response: true, records: [...mockPosts] };
  }
  const res = await apiRequest(ApiPaths.GET_PARTNER_POSTS(), "GET");
  if (!res.success) return { response: false, records: [] };
  const d = res.data ?? {};
  return { response: true, records: d.records ?? d.data?.records ?? [] };
}

/** Mock-only: persist post status changes from Post Management view. */
export function updatePartnerPostStatus(
  postId: number | undefined,
  status: PostModel["status"]
): void {
  if (USE_MOCK_PARTNER_MANAGEMENT_API && postId != null) {
    mockPosts = mockPosts.map((p) => (p.id === postId ? { ...p, status } : p));
  }
}

/** Mock-only: append a post from Post Management “Add post”. */
export function addPartnerPostMock(payload: {
  partner_name: string;
  description: string;
  media_type: "image" | "video";
  location?: string;
}): void {
  if (!USE_MOCK_PARTNER_MANAGEMENT_API) return;
  const nextId = Math.max(0, ...mockPosts.map((p) => Number(p.id) || 0)) + 1;
  const partner_id = `P${String(nextId).padStart(3, "0")}`;
  mockPosts = [
    {
      id: nextId,
      partner_id,
      partner_name: payload.partner_name.trim(),
      description: payload.description.trim(),
      media_type: payload.media_type,
      location: (payload.location ?? "").trim() || "-",
      uploaded_date: new Date().toISOString().slice(0, 10),
      status: "pending",
    },
    ...mockPosts,
  ];
}
