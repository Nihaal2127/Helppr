import type { QuoteRow, QuoteTabKey } from "../pages/quoteManagement/quoteTypes";
import { quoteListMockData } from "../mockData/quoteMockData";
import { fetchPartnerDropDown } from "./userService";
import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";
import type { ServerTableSortBy } from "../helper/serverTableSort";

export type OptionType = { value: string; label: string };

/** Same shape as `CustomTable` server sort; `id` is the column accessor / API `sort_by` field. */
export type QuoteListSort = ServerTableSortBy;

export type QuoteListFilters = {
  keyword?: string;
  from_date?: string | null;
  to_date?: string | null;
};

const USE_MOCK_QUOTE_API = true;

/** Same rule as backend `tab` query: show rows whose DB `status` matches the tab (case-insensitive). */
function filterQuotesByStatusTab(records: QuoteRow[], tab: QuoteTabKey): QuoteRow[] {
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
  if (!sort.length) return rows;
  const { id, desc } = sort[0];
  const dir = desc ? -1 : 1;
  return [...rows].sort((a, b) => {
    const va = sortValueForColumn(a, id);
    const vb = sortValueForColumn(b, id);
    if (typeof va === "number" && typeof vb === "number") {
      return (va - vb) * dir;
    }
    return String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: "base" }) * dir;
  });
}

function filterQuotesForTab(
  rows: QuoteRow[],
  tab: QuoteTabKey,
  filters: QuoteListFilters
): QuoteRow[] {
  const keyword = (filters.keyword ?? "").trim().toLowerCase();
  const fromTs =
    filters.from_date != null ? new Date(filters.from_date).setHours(0, 0, 0, 0) : null;
  const toTs =
    filters.to_date != null ? new Date(filters.to_date).setHours(23, 59, 59, 999) : null;

  return rows.filter((row) => {
    if (!matchesKeyword(row, keyword)) return false;

    const rowDateTs = parseQuoteDateToMs(
      tab === "accepted" || tab === "success"
        ? row.scheduled_date || row.requested_date
        : row.requested_date
    );

    const matchesFrom = fromTs == null || (rowDateTs != null && rowDateTs >= fromTs);
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
}> {
  if (USE_MOCK_QUOTE_API) {
    const allRows = filterQuotesByStatusTab(quoteListMockData.records, tab);
    const filtered = filterQuotesForTab(allRows, tab, filters);
    const sorted = sortQuotesInMemory(filtered, sort);

    const totalPages = sorted.length ? Math.ceil(sorted.length / pageSize) : 0;
    const start = Math.max(0, (page - 1) * pageSize);
    const records = sorted.slice(start, start + pageSize);

    return { response: true, quotes: records, totalPages };
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

  const primarySort = sort[0];
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

  if (!res.success) return { response: false, quotes: [], totalPages: 0 };

  const d = res.data ?? {};
  const inner = d.data ?? {};
  const records = Array.isArray(inner.records) ? inner.records : [];
  const totalPages = Number(inner.totalPages ?? 0) || 0;

  return { response: true, quotes: records, totalPages };
}

export async function fetchQuoteCreateOptions(): Promise<{
  quoteServiceOptions: OptionType[];
  quotePartnerOptions: OptionType[];
}> {
  // Right now, the create modal options are derived from the same mock quote dataset.
  // In "real mode", we can swap this to real endpoints without touching the UI.
  const allMock = quoteListMockData.records;
  const services = Array.from(
    new Set(
      allMock
        .flatMap((row) => String(row.requested_services || "").split(","))
        .map((s) => s.trim())
        .filter(Boolean)
    )
  );

  const partners = Array.from(
    new Set(
      allMock.map((row) => String(row.requested_partner || "").trim()).filter(Boolean)
    )
  );

  return {
    quoteServiceOptions: services.map((s) => ({ value: s, label: s })),
    quotePartnerOptions: partners.map((p) => ({ value: p, label: p })),
  };
}

export async function fetchQuotePartnerDropDown(
  serviceId?: string
): Promise<{
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

