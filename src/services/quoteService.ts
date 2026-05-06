import type {
  QuoteRow,
  QuoteTabKey,
} from "../pages/quoteManagement/quoteTypes";
import { quoteListMockData } from "../mockData/quoteMockData";
import { fetchPartnerDropDown } from "./userService";
import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";
import type { ServerTableSortBy } from "../helper/serverTableSort";

export type OptionType = { value: string; label: string };

/** How the Add Quote form collects schedule fields for a chosen service. */
export type QuoteServiceScheduleMode = "single" | "range" | "hourly";

export type QuoteUserOption = OptionType & { user_name: string };

/**
 * Maps a service label to schedule UI: one day, date range, or one day with time window.
 * Heuristic over mock labels; replace with API-driven metadata when available.
 */
export function getQuoteServiceScheduleMode(
  serviceLabel: string
): QuoteServiceScheduleMode {
  const s = String(serviceLabel || "")
    .toLowerCase()
    .trim();
  if (!s) return "single";

  if (
    /sofa|deep cleaning|full home|termite|painting|marble polishing|office sanitization|terrace waterproof|elevator|home cleaning and dusting/.test(
      s
    )
  ) {
    return "range";
  }
  if (
    /repair|ac |^ac |split ac|geyser|microwave|refrigerator|washing machine|cctv|laptop|electrical|plumbing|kitchen sink|pest control|installation|install|chimney|led tv|inverter|water tank|bathroom sanitization|garden|curtain|window mesh|roof leak|false ceiling|glass facade|wooden flooring/.test(
      s
    )
  ) {
    return "hourly";
  }
  return "single";
}

/** Same shape as `CustomTable` server sort; `id` is the column accessor / API `sort_by` field. */
export type QuoteListSort = ServerTableSortBy;

export type QuoteListFilters = {
  keyword?: string;
  from_date?: string | null;
  to_date?: string | null;
};

const USE_MOCK_QUOTE_API = true;

/** Only these accessors match server `sort_by` and in-memory sort (see quote table columns). */
const QUOTE_SORTABLE_ACCESSORS = new Set([
  "requested_services",
  "services",
  "requested_partner",
  "partner_name",
  "user_name",
]);

export function normalizeQuoteListSort(sort: QuoteListSort): QuoteListSort {
  if (!sort.length) return [];
  const first = sort[0];
  if (!first?.id || !QUOTE_SORTABLE_ACCESSORS.has(first.id)) return [];
  return [{ id: first.id, desc: Boolean(first.desc) }];
}

/** Same rule as backend `tab` query: show rows whose DB `status` matches the tab (case-insensitive). */
function filterQuotesByStatusTab(
  records: QuoteRow[],
  tab: QuoteTabKey
): QuoteRow[] {
  const want = tab.toLowerCase();
  return records.filter((r) => String(r.status ?? "").toLowerCase() === want);
}

function parseQuoteDateToMs(input?: string): number | null {
  if (!input) return null;
  const trimmed = String(input).trim();
  if (!trimmed) return null;

  const fromPart = trimmed.includes(" to ")
    ? trimmed.split(/\s+to\s+/i)[0]
    : trimmed.split(/\s+[–—-]\s+/)[0];

  const dt = new Date(fromPart);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.getTime();
}

function matchesKeyword(row: QuoteRow, keyword: string): boolean {
  if (!keyword) return true;
  const searchable = [
    row.quote_id,
    row.order_id,
    row.requested_services,
    row.services,
    row.requested_partner,
    row.partner_name,
    row.user_name,
    row.service_price != null ? String(row.service_price) : "",
    `${row.door_no}, ${row.street}, ${row.city}`,
    row.status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchable.includes(keyword);
}

function sortValueForColumn(row: QuoteRow, sortId: string): string | number {
  switch (sortId) {
    case "quote_id":
      return row.quote_id ?? "";
    case "requested_services":
      return row.requested_services ?? "";
    case "requested_partner":
      return row.requested_partner ?? "";
    case "partner_name":
      return row.partner_name ?? "";
    case "user_name":
      return row.user_name ?? "";
    case "service_price":
      return row.service_price ?? 0;
    case "requested_date":
      return row.requested_date ?? "";
    case "requested_time":
      return row.requested_time ?? "";
    case "services":
      return row.services ?? row.requested_services ?? "";
    case "scheduled_date":
      return row.scheduled_date ?? "";
    case "order_id":
      return row.order_id ?? "";
    case "status":
      return row.status ?? "";
    case "address":
    case "location":
      return `${row.door_no}, ${row.street}, ${row.city}`;
    case "time":
    case "time_range":
      return `${row.service_from_time ?? ""} ${row.service_to_time ?? ""}`;
    default:
      return "";
  }
}

function sortQuotesInMemory(rows: QuoteRow[], sort: QuoteListSort): QuoteRow[] {
  const safe = normalizeQuoteListSort(sort);
  if (!safe.length) return rows;
  const { id, desc } = safe[0];
  const dir = desc ? -1 : 1;
  return [...rows].sort((a, b) => {
    const va = sortValueForColumn(a, id);
    const vb = sortValueForColumn(b, id);
    if (typeof va === "number" && typeof vb === "number") {
      return (va - vb) * dir;
    }
    return (
      String(va).localeCompare(String(vb), undefined, {
        numeric: true,
        sensitivity: "base",
      }) * dir
    );
  });
}

function filterQuotesForTab(
  rows: QuoteRow[],
  tab: QuoteTabKey,
  filters: QuoteListFilters
): QuoteRow[] {
  const keyword = (filters.keyword ?? "").trim().toLowerCase();
  const fromTs =
    filters.from_date != null
      ? new Date(filters.from_date).setHours(0, 0, 0, 0)
      : null;
  const toTs =
    filters.to_date != null
      ? new Date(filters.to_date).setHours(23, 59, 59, 999)
      : null;

  return rows.filter((row) => {
    if (!matchesKeyword(row, keyword)) return false;

    const rowDateTs = parseQuoteDateToMs(
      tab === "accepted" || tab === "success"
        ? row.scheduled_date || row.requested_date
        : row.requested_date
    );

    const matchesFrom =
      fromTs == null || (rowDateTs != null && rowDateTs >= fromTs);
    const matchesTo = toTs == null || (rowDateTs != null && rowDateTs <= toTs);
    return matchesFrom && matchesTo;
  });
}

export async function fetchQuotes(
  tab: QuoteTabKey,
  page: number,
  pageSize: number,
  filters: QuoteListFilters,
  sort: QuoteListSort = []
): Promise<{
  response: boolean;
  quotes: QuoteRow[];
  totalPages: number;
  /** Total rows for this tab + filters (before pagination). */
  totalCount: number;
}> {
  if (USE_MOCK_QUOTE_API) {
    const allRows = filterQuotesByStatusTab(quoteListMockData.records, tab);
    const filtered = filterQuotesForTab(allRows, tab, filters);
    const sorted = sortQuotesInMemory(filtered, sort);

    const totalCount = sorted.length;
    const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 0;
    const start = Math.max(0, (page - 1) * pageSize);
    const records = sorted.slice(start, start + pageSize);

    return { response: true, quotes: records, totalPages, totalCount };
  }

  // GET `ApiPaths.GET_QUOTES()` — query params documented for backend alignment.
  const QUOTE_LIST_ENDPOINT = ApiPaths.GET_QUOTES();
  const params = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
    tab,
    ...(filters.keyword ? { keyword: filters.keyword } : {}),
    ...(filters.from_date ? { from_date: filters.from_date } : {}),
    ...(filters.to_date ? { to_date: filters.to_date } : {}),
  });

  const safeSort = normalizeQuoteListSort(sort);
  const primarySort = safeSort[0];
  if (primarySort) {
    params.set("sort_by", primarySort.id);
    params.set("sort_order", primarySort.desc ? "desc" : "asc");
  }

  const res = await apiRequest(
    `${QUOTE_LIST_ENDPOINT}?${params.toString()}`,
    "GET",
    undefined,
    false,
    true
  );

  if (!res.success)
    return { response: false, quotes: [], totalPages: 0, totalCount: 0 };

  const d = res.data ?? {};
  const inner = d.data ?? {};
  const records = Array.isArray(inner.records) ? inner.records : [];
  const totalPages = Number(inner.totalPages ?? 0) || 0;

  const rawTotal =
    inner.total_count ??
    inner.totalCount ??
    inner.total ??
    inner.count ??
    d.total_count ??
    d.totalCount ??
    d.total;
  let totalCount = Number(rawTotal);
  if (!Number.isFinite(totalCount) || totalCount < 0) {
    totalCount =
      totalPages > 0 && page === totalPages
        ? (totalPages - 1) * pageSize + records.length
        : 0;
  }

  return { response: true, quotes: records, totalPages, totalCount };
}

/**
 * Services available for a category (from mock quote rows; replace with API when wired).
 */
export function getQuoteServiceOptionsForCategory(
  categoryId: string | undefined | null
): OptionType[] {
  const cid = String(categoryId ?? "").trim();
  if (!cid) return [];

  const names = new Set<string>();
  for (const row of quoteListMockData.records) {
    if (String(row.category_id ?? "").trim() !== cid) continue;
    const raw = String(row.requested_services ?? "").trim();
    if (!raw) continue;
    for (const part of raw.split(",")) {
      const s = part.trim();
      if (s) names.add(s);
    }
  }

  return Array.from(names)
    .sort((a, b) => a.localeCompare(b))
    .map((s) => ({ value: s, label: s }));
}

export async function fetchQuoteCreateOptions(): Promise<{
  quotePartnerOptions: OptionType[];
  quoteUserOptions: QuoteUserOption[];
  quoteEmployeeOptions: OptionType[];
  quoteCategoryOptions: OptionType[];
}> {
  // Right now, the create modal options are derived from the same mock quote dataset.
  // In "real mode", you can swap this to real endpoints without touching the UI.
  const allMock = quoteListMockData.records;

  const partners = Array.from(
    new Set(
      allMock
        .map((row) => String(row.requested_partner || "").trim())
        .filter(Boolean)
    )
  );

  const userById = new Map<string, QuoteUserOption>();
  for (const row of allMock) {
    const uid = String(row.user_id || "").trim();
    if (!uid) continue;
    const name = String(row.user_name || "").trim() || uid;
    const phone = String(row.phone_number || "").trim();
    const label = phone ? `${name} (${phone})` : name;
    if (!userById.has(uid)) {
      userById.set(uid, { value: uid, label, user_name: name });
    }
  }

  const employeeById = new Map<string, OptionType>();
  for (const row of allMock) {
    const eid = String(row.employee_id || "").trim();
    if (!eid) continue;
    const ename = String(row.employee_name || "").trim() || eid;
    if (!employeeById.has(eid)) {
      employeeById.set(eid, { value: eid, label: ename });
    }
  }

  const categoryById = new Map<string, OptionType>();
  for (const row of allMock) {
    const cid = String(row.category_id || "").trim();
    if (!cid) continue;
    const cname = String(row.category_name || "").trim() || cid;
    if (!categoryById.has(cid)) {
      categoryById.set(cid, { value: cid, label: cname });
    }
  }

  return {
    quotePartnerOptions: partners.map((p) => ({ value: p, label: p })),
    quoteUserOptions: Array.from(userById.values()).sort((a, b) =>
      a.user_name.localeCompare(b.user_name)
    ),
    quoteEmployeeOptions: Array.from(employeeById.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    ),
    quoteCategoryOptions: Array.from(categoryById.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    ),
  };
}

export async function fetchQuotePartnerDropDown(serviceId?: string): Promise<{
  partners: Array<any>;
}> {
  // Mock mode: derive partner list from mock quotes.
  // Real mode: delegate to existing partner dropdown API via userService.
  const MOCK_MODE = true;
  if (MOCK_MODE) {
    const partnerSet = new Set<string>();
    for (const r of quoteListMockData.records) {
      if (r.requested_partner) partnerSet.add(String(r.requested_partner));
      if (r.partner_name) partnerSet.add(String(r.partner_name));
    }

    const partners = Array.from(partnerSet);
    return {
      partners: partners.map((name, idx) => ({
        _id: `QT-PT-${idx + 1}`,
        partner_id: `P-${idx + 1}`,
        partner_name: name,
        name,
      })),
    };
  }

  return fetchPartnerDropDown(serviceId);
}
