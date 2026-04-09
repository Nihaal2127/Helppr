import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";
import type { SubscriptionPlanModel } from "../pages/partnerManagement/subscriptionPlans/AddEditSubscriptionPlanDialog";
import type { PartnerSubscriptionModel } from "../pages/partnerManagement/subscriptionPlans/AddEditPartnerSubscriptionDialog";
import type { PostModel } from "../pages/partnerManagement/postManagement/AddEditPostManagementDialog";
import {
  partnerPortfoliosSeed,
  partnerPostsSeed,
  partnerSubscriptionPlansSeed,
  partnerSubscriptionsSeed,
} from "../mockData/partnerManagementMockData";
import type { ServerTableSortBy } from "../helper/serverTableSort";

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

let mockPlans: SubscriptionPlanModel[] = partnerSubscriptionPlansSeed.map((item) => ({ ...item }));
let mockPartnerSubscriptions: PartnerSubscriptionModel[] = partnerSubscriptionsSeed.map((item) => ({ ...item }));
let mockPortfolios: PortfolioRow[] = partnerPortfoliosSeed.map((item) => ({ ...item }));
let mockPosts: PostModel[] = partnerPostsSeed.map((item) => ({ ...item }));

function statsFor(list: Array<{ is_active: boolean }>): ListStats {
  const total = list.length;
  const active = list.filter((x) => x.is_active).length;
  return { Total: total, Active: active, Inactive: total - active };
}

function paginate<T>(rows: T[], page: number, limit: number): { records: T[]; totalPages: number } {
  const totalPages = rows.length ? Math.ceil(rows.length / limit) : 0;
  const start = Math.max(0, (page - 1) * limit);
  return { records: rows.slice(start, start + limit), totalPages };
}

export async function fetchSubscriptionPlans(
  page: number,
  limit: number,
  filters: { name?: string; status?: string; sort?: string },
  sortBy: ServerTableSortBy = []
): Promise<{ response: boolean; records: SubscriptionPlanModel[]; totalPages: number; stats: ListStats }> {
  const primarySort = sortBy[0];
  if (USE_MOCK_PARTNER_MANAGEMENT_API) {
    const keyword = (filters.name ?? "").trim().toLowerCase();
    const statusRaw = (filters.status ?? "").toLowerCase();
    const sortRaw = primarySort ? (primarySort.desc ? "desc" : "asc") : String(filters.sort ?? "").toLowerCase();

    let data = [...mockPlans];
    if (statusRaw === "true") data = data.filter((x) => x.is_active);
    if (statusRaw === "false") data = data.filter((x) => !x.is_active);

    if (keyword) {
      data = data.filter((p) => {
        const hay = [p.plan_name, p.plan_description, p.price, p.duration, p.duration_type].join(" ").toLowerCase();
        return hay.includes(keyword);
      });
    }

    if (sortRaw) {
      const ascending = sortRaw === "asc" || sortRaw === "1";
      data.sort((a, b) =>
        ascending ? (a.plan_name || "").localeCompare(b.plan_name || "") : (b.plan_name || "").localeCompare(a.plan_name || "")
      );
    }

    const { records, totalPages } = paginate(data, page, limit);
    return { response: true, records, totalPages, stats: statsFor(mockPlans) };
  }

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(filters.name ? { name: filters.name } : {}),
    ...(filters.name ? { keyword: filters.name } : {}),
    ...(filters.status && filters.status !== "all"
      ? {
          is_active:
            filters.status.toLowerCase() === "active"
              ? "true"
              : filters.status.toLowerCase() === "expired"
              ? "false"
              : filters.status.toLowerCase(),
        }
      : {}),
    ...(filters.sort ? { sort: filters.sort } : {}),
    ...(primarySort?.id ? { sort_by: primarySort.id } : {}),
    ...(primarySort ? { sort_order: primarySort.desc ? "desc" : "asc" } : {}),
  });
  const res = await apiRequest(`${ApiPaths.GET_PARTNER_SUBSCRIPTION_PLANS()}?${params.toString()}`, "GET");
  if (!res.success) return { response: false, records: [], totalPages: 0, stats: { Total: 0, Active: 0, Inactive: 0 } };
  const d = res.data ?? {};
  return {
    response: true,
    records: d.records ?? d.data?.records ?? [],
    totalPages: d.totalPages ?? d.data?.totalPages ?? 0,
    stats: d.stats ?? d.data?.stats ?? { Total: 0, Active: 0, Inactive: 0 },
  };
}

export async function voidSubscriptionPlan(id: string): Promise<boolean> {
  if (USE_MOCK_PARTNER_MANAGEMENT_API) {
    mockPlans = mockPlans.map((p) => (p._id === id ? { ...p, is_active: false } : p));
    return true;
  }
  const res = await apiRequest(ApiPaths.VOID_PARTNER_SUBSCRIPTION_PLAN(id), "PUT");
  return Boolean(res.success);
}

export async function saveSubscriptionPlan(plan: SubscriptionPlanModel, isEditable: boolean): Promise<boolean> {
  if (USE_MOCK_PARTNER_MANAGEMENT_API) {
    if (isEditable) {
      mockPlans = mockPlans.map((p) => (p._id === plan._id ? { ...p, ...plan } : p));
      return true;
    }
    const nextId = `PLN${String(Date.now()).slice(-6)}`;
    mockPlans = [{ ...plan, _id: nextId }, ...mockPlans];
    return true;
  }
  const path = isEditable ? ApiPaths.UPDATE_PARTNER_SUBSCRIPTION_PLAN(plan._id) : ApiPaths.CREATE_PARTNER_SUBSCRIPTION_PLAN;
  const method = isEditable ? "PUT" : "POST";
  const res = await apiRequest(path, method, plan);
  return Boolean(res.success);
}

export async function fetchPartnerSubscriptions(
  page: number,
  limit: number,
  filters: {
    name?: string;
    status?: string;
    sort?: string;
    planType?: string;
    location?: string;
    fromDate?: string;
    toDate?: string;
  },
  sortBy: ServerTableSortBy = []
): Promise<{ response: boolean; records: PartnerSubscriptionModel[]; totalPages: number; stats: ListStats }> {
  const primarySort = sortBy[0];
  if (USE_MOCK_PARTNER_MANAGEMENT_API) {
    const keyword = (filters.name ?? "").trim().toLowerCase();
    const statusRaw = (filters.status ?? "").toLowerCase();
    const sortRaw = primarySort ? (primarySort.desc ? "desc" : "asc") : String(filters.sort ?? "").toLowerCase();

    let data = [...mockPartnerSubscriptions];
    if (statusRaw === "true" || statusRaw === "active") data = data.filter((x) => x.is_active);
    if (statusRaw === "false" || statusRaw === "expired") data = data.filter((x) => !x.is_active);

    if (keyword) {
      data = data.filter((p) => {
        const hay = [p.partner_name, p.partner_id, p.subscription_plan, p.address ?? p.location].join(" ").toLowerCase();
        return hay.includes(keyword);
      });
    }

    const planTypeRaw = (filters.planType ?? "").toLowerCase();
    if (planTypeRaw && planTypeRaw !== "all") {
      data = data.filter((p) => (p.subscription_plan || "").toLowerCase() === planTypeRaw);
    }

    const locationRaw = (filters.location ?? "").toLowerCase();
    if (locationRaw && locationRaw !== "all") {
      data = data.filter((p) => (p.address ?? p.location ?? "").toLowerCase().includes(locationRaw));
    }

    const fromDateRaw = (filters.fromDate ?? "").trim();
    const toDateRaw = (filters.toDate ?? "").trim();
    if (fromDateRaw || toDateRaw) {
      const fromTs = fromDateRaw ? new Date(fromDateRaw).getTime() : null;
      const toTs = toDateRaw ? new Date(toDateRaw).getTime() : null;
      data = data.filter((p) => {
        const startTs = new Date(p.subscription_start_date).getTime();
        const afterFrom = fromTs === null || startTs >= fromTs;
        const beforeTo = toTs === null || startTs <= toTs;
        return afterFrom && beforeTo;
      });
    }

    if (sortRaw) {
      const ascending = sortRaw === "asc" || sortRaw === "1";
      data.sort((a, b) =>
        ascending ? (a.partner_name || "").localeCompare(b.partner_name || "") : (b.partner_name || "").localeCompare(a.partner_name || "")
      );
    }

    const { records, totalPages } = paginate(data, page, limit);
    return { response: true, records, totalPages, stats: statsFor(mockPartnerSubscriptions as any) };
  }

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(filters.name ? { name: filters.name } : {}),
    ...(filters.name ? { keyword: filters.name } : {}),
    ...(filters.status && filters.status !== "All" ? { is_active: filters.status.toLowerCase() } : {}),
    ...(filters.planType && filters.planType !== "all" ? { plan_type: filters.planType } : {}),
    ...(filters.location && filters.location !== "all" ? { location: filters.location } : {}),
    ...(filters.fromDate ? { from_date: filters.fromDate } : {}),
    ...(filters.toDate ? { to_date: filters.toDate } : {}),
    ...(filters.sort ? { sort: filters.sort } : {}),
    ...(primarySort?.id ? { sort_by: primarySort.id } : {}),
    ...(primarySort ? { sort_order: primarySort.desc ? "desc" : "asc" } : {}),
  });
  const res = await apiRequest(`${ApiPaths.GET_PARTNER_SUBSCRIPTIONS()}?${params.toString()}`, "GET");
  if (!res.success) return { response: false, records: [], totalPages: 0, stats: { Total: 0, Active: 0, Inactive: 0 } };
  const d = res.data ?? {};
  return {
    response: true,
    records: d.records ?? d.data?.records ?? [],
    totalPages: d.totalPages ?? d.data?.totalPages ?? 0,
    stats: d.stats ?? d.data?.stats ?? { Total: 0, Active: 0, Inactive: 0 },
  };
}

export async function voidPartnerSubscription(id: string): Promise<boolean> {
  if (USE_MOCK_PARTNER_MANAGEMENT_API) {
    mockPartnerSubscriptions = mockPartnerSubscriptions.map((p) =>
      String(p._id) === String(id) ? { ...p, is_active: false } : p
    );
    return true;
  }
  const res = await apiRequest(ApiPaths.VOID_PARTNER_SUBSCRIPTION(id), "PUT");
  return Boolean(res.success);
}

export async function savePartnerSubscription(
  sub: PartnerSubscriptionModel,
  isEditable: boolean
): Promise<boolean> {
  if (USE_MOCK_PARTNER_MANAGEMENT_API) {
    if (isEditable) {
      mockPartnerSubscriptions = mockPartnerSubscriptions.map((p) =>
        String(p._id) === String(sub._id) ? { ...p, ...sub } : p
      );
      return true;
    }
    const nextId = String(Date.now());
    mockPartnerSubscriptions = [{ ...sub, _id: nextId }, ...mockPartnerSubscriptions];
    return true;
  }

  const path = isEditable ? ApiPaths.UPDATE_PARTNER_SUBSCRIPTION(String(sub._id)) : ApiPaths.CREATE_PARTNER_SUBSCRIPTION;
  const method = isEditable ? "PUT" : "POST";
  const res = await apiRequest(path, method, sub);
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
): Promise<{ response: boolean; records: PortfolioRow[]; totalPages: number; stats: ListStats }> {
  const primarySort = sortBy[0];
  if (USE_MOCK_PARTNER_MANAGEMENT_API) {
    const keyword = (filters.name ?? "").trim().toLowerCase();
    const statusRaw = (filters.status ?? "").toLowerCase();
    const sortRaw = primarySort ? (primarySort.desc ? "desc" : "asc") : String(filters.sort ?? "").toLowerCase();
    const categoryRaw = (filters.category ?? "").toLowerCase();
    const serviceRaw = (filters.service ?? "").toLowerCase();
    const locationRaw = (filters.location ?? "").toLowerCase();

    let data = [...mockPortfolios];
    if (statusRaw === "true" || statusRaw === "active") data = data.filter((x) => x.is_active);
    if (statusRaw === "false" || statusRaw === "inactive") data = data.filter((x) => !x.is_active);

    if (keyword) {
      data = data.filter((p) => {
        const hay = [p.partner_name, p.partner_id, p.category, p.service, p.location].join(" ").toLowerCase();
        return hay.includes(keyword);
      });
    }
    if (categoryRaw && categoryRaw !== "all") {
      data = data.filter((p) => (p.category || "").toLowerCase().includes(categoryRaw));
    }
    if (serviceRaw && serviceRaw !== "all") {
      data = data.filter((p) => (p.service || "").toLowerCase().includes(serviceRaw));
    }
    if (locationRaw && locationRaw !== "all") {
      data = data.filter((p) => (p.location || "").toLowerCase().includes(locationRaw));
    }

    if (sortRaw) {
      const ascending = sortRaw === "asc" || sortRaw === "1";
      data.sort((a, b) =>
        ascending ? a.partner_name.localeCompare(b.partner_name) : b.partner_name.localeCompare(a.partner_name)
      );
    }

    const { records, totalPages } = paginate(data, page, limit);
    return { response: true, records, totalPages, stats: statsFor(mockPortfolios) };
  }

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(filters.name ? { name: filters.name } : {}),
    ...(filters.name ? { keyword: filters.name } : {}),
    ...(filters.status && filters.status !== "All" ? { is_active: filters.status.toLowerCase() } : {}),
    ...(filters.sort ? { sort: filters.sort } : {}),
    ...(primarySort?.id ? { sort_by: primarySort.id } : {}),
    ...(primarySort ? { sort_order: primarySort.desc ? "desc" : "asc" } : {}),
    ...(filters.category && filters.category !== "all" ? { category: filters.category } : {}),
    ...(filters.service && filters.service !== "all" ? { service: filters.service } : {}),
    ...(filters.location && filters.location !== "all" ? { location: filters.location } : {}),
  });
  const res = await apiRequest(`${ApiPaths.GET_PARTNER_PORTFOLIOS()}?${params.toString()}`, "GET");
  if (!res.success) return { response: false, records: [], totalPages: 0, stats: { Total: 0, Active: 0, Inactive: 0 } };
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
    mockPortfolios = mockPortfolios.map((p) => (p._id === id ? { ...p, is_active: false } : p));
    return true;
  }
  const res = await apiRequest(ApiPaths.VOID_PARTNER_PORTFOLIO(id), "PUT");
  return Boolean(res.success);
}

export async function fetchPosts(): Promise<{ response: boolean; records: PostModel[] }> {
  if (USE_MOCK_PARTNER_MANAGEMENT_API) {
    return { response: true, records: [...mockPosts] };
  }
  const res = await apiRequest(ApiPaths.GET_PARTNER_POSTS(), "GET");
  if (!res.success) return { response: false, records: [] };
  const d = res.data ?? {};
  return { response: true, records: d.records ?? d.data?.records ?? [] };
}

