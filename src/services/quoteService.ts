import type {
  QuoteRow,
  QuoteTabKey,
} from "../pages/quoteManagement/quoteTypes";
import { quoteListMockData } from "../mockData/quoteMockData";
import {
  APP_USER_TYPE,
  fetchPartnerDropDown,
  fetchUserDropDown,
} from "./userService";
import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";
import type { ServerTableSortBy } from "../helper/serverTableSort";
import { fetchCategoryDropDown } from "./categoryService";
import { fetchServiceDropDown } from "./servicesService";
import type { ServiceDropDownOption } from "./servicesService";
import { normalizeServiceCategoryRef } from "./servicesService";
import {
  extractMinDepositTypeKey,
  labelForMinDepositType,
} from "../helper/serviceMinDepositDisplay";
import { getLocalStorage } from "../helper/localStorageHelper";
import { AppConstant, UserRole } from "../constant/AppConstant";
import { sessionMayUseFranchiseIdApiFilter } from "../helper/headerFranchisePreference";

export type OptionType = { value: string; label: string };

/** How the Add Quote form collects schedule fields for a chosen service. */
export type QuoteServiceScheduleMode = "single" | "range" | "hourly";

export type QuoteUserOption = OptionType & { user_name: string };

/**
 * Maps a service label to schedule UI: one day, date range, or one day with time window.
 * Heuristic over mock labels; with live API, options use real service names from dropdown.
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

/**
 * Add-quote schedule layout from service `payment_type` / `min_deposit_type`, with label fallback when API omits type.
 * - **per_day**, **per_month** → date range + daily time window (`range`).
 * - **per_hour**, **per_consultancy** → single date + start/end times (`hourly`).
 */
export function getQuoteScheduleModeFromServiceOption(opts: {
  payment_type?: string;
  label: string;
}): QuoteServiceScheduleMode {
  const key = extractMinDepositTypeKey(str(opts.payment_type));
  if (key === "per_day" || key === "per_month") return "range";
  if (key === "per_hour" || key === "per_consultancy") return "hourly";
  if (str(opts.payment_type)) return "hourly";
  return getQuoteServiceScheduleMode(str(opts.label));
}

export type QuoteListSort = ServerTableSortBy;

export type QuoteListFilters = {
  keyword?: string;
  from_date?: string | null;
  to_date?: string | null;
  /** When set, appended to `GET /quote/getAll` (franchise-scoped list). */
  franchise_id?: string | null;
};

/** Raw `record` from `GET /franchise/related-catalog/:id`. */
export type FranchiseRelatedCatalogRecord = {
  franchise?: {
    _id?: string;
    name?: string;
    area_id?: unknown;
    pincode?: string;
    pincodes?: unknown[];
  };
  franchise_categories?: unknown[];
  franchise_services?: unknown[];
  categories?: unknown[];
  services?: unknown[];
  partners?: unknown[];
  employees?: unknown[];
  /** End users scoped to this catalog response (staging shape). */
  customers?: unknown[];
  /** Optional hydrated areas on the same response (pincodes — avoids GET /area/get). */
  areas?: unknown[];
  franchise_areas?: unknown[];
};

function asObjectRecords(v: unknown): Record<string, unknown>[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => x != null && typeof x === "object") as Record<
    string,
    unknown
  >[];
}

/** One in-flight `related-catalog` request per franchise id (quote page + effect may both ask). */
const relatedCatalogInflight = new Map<
  string,
  Promise<{ success: boolean; record: FranchiseRelatedCatalogRecord | null }>
>();

/**
 * Loads franchise-scoped categories, services, partners, and employees in one call
 * (`GET /franchise/related-catalog/:franchiseId`).
 */
export async function fetchFranchiseRelatedCatalog(
  franchiseId: string
): Promise<{ success: boolean; record: FranchiseRelatedCatalogRecord | null }> {
  const id = str(franchiseId);
  if (!id) return { success: false, record: null };
  if (USE_MOCK_QUOTE_API) {
    return {
      success: true,
      record: {
        categories: [],
        services: [],
        partners: [],
        employees: [],
      },
    };
  }

  const existing = relatedCatalogInflight.get(id);
  if (existing) return existing;

  const p = (async (): Promise<{
    success: boolean;
    record: FranchiseRelatedCatalogRecord | null;
  }> => {
    const res = await apiRequest(
      ApiPaths.GET_FRANCHISE_RELATED_CATALOG(id),
      "GET",
      undefined,
      false,
      true,
      true
    );
    if (!res.success) return { success: false, record: null };
    const raw =
      (res.data as { record?: unknown })?.record ??
      (res.data as { data?: { record?: unknown } })?.data?.record;
    if (!raw || typeof raw !== "object")
      return { success: true, record: { categories: [], services: [] } };
    return { success: true, record: raw as FranchiseRelatedCatalogRecord };
  })();

  relatedCatalogInflight.set(id, p);
  void p.finally(() => {
    relatedCatalogInflight.delete(id);
  });
  return p;
}

export type MappedFranchiseQuoteCatalog = {
  quoteCategoryOptions: OptionType[];
  quoteCatalogServices: ServiceDropDownOption[];
  quotePartnerRecords: Record<string, unknown>[];
  quoteEmployeeOptions: OptionType[];
  quoteEmployeeRecords: Record<string, unknown>[];
  quoteUserOptions: QuoteUserOption[];
  /** Same customers as `quoteUserOptions` — full rows for addresses without `GET /user/get/:id`. */
  quoteCustomerRecords: Record<string, unknown>[];
};

function categoryIdFromFranchiseCategoryRow(
  fc: Record<string, unknown>
): string {
  const nested = fc.category as Record<string, unknown> | undefined;
  return str(
    fc.category_id ??
      nested?._id ??
      nested?.id ??
      fc.franchise_category_id
  );
}

function categoryNameFromFranchiseCategoryRow(
  fc: Record<string, unknown>
): string {
  const nested = fc.category as Record<string, unknown> | undefined;
  return str(fc.name ?? nested?.name ?? nested?.category_name);
}

/** Staging `record.categories[]`: `{ category_id, is_active, category?: { _id, name } }`. */
function categoryIdFromHydratedRow(c: Record<string, unknown>): string {
  const nested = c.category as Record<string, unknown> | undefined;
  return str(
    c.category_id ?? nested?._id ?? nested?.id ?? c._id ?? c.id
  );
}

function categoryNameFromHydratedRow(c: Record<string, unknown>): string {
  const nested = c.category as Record<string, unknown> | undefined;
  return str(
    nested?.name ?? nested?.category_name ?? c.name ?? c.category_name
  );
}

function mergeCategoriesFromFranchiseCategoryDocs(
  record: FranchiseRelatedCatalogRecord,
  catById: Map<string, string>
): void {
  for (const doc of asObjectRecords(record.franchise_categories)) {
    const list = doc.categories_list;
    if (!Array.isArray(list)) {
      const id = categoryIdFromFranchiseCategoryRow(doc);
      if (!id) continue;
      const active = doc.is_active !== false && doc.is_active !== 0;
      if ("is_active" in doc && !active) continue;
      const name = categoryNameFromFranchiseCategoryRow(doc) || id;
      if (!catById.has(id)) catById.set(id, name);
      continue;
    }
    const activeSet = new Set(
      Array.isArray(doc.active_categories)
        ? (doc.active_categories as unknown[]).map((x) => str(x)).filter(Boolean)
        : []
    );
    for (const row of asObjectRecords(list as unknown[])) {
      const cid = str(row.category_id ?? row._id ?? row.id);
      if (!cid) continue;
      if (activeSet.size > 0 && !activeSet.has(cid)) continue;
      if (row.is_active === false || row.is_active === 0) continue;
      const nested = row.category as Record<string, unknown> | undefined;
      const name =
        str(nested?.name ?? nested?.category_name) ||
        categoryNameFromFranchiseCategoryRow(row) ||
        cid;
      if (!catById.has(cid)) catById.set(cid, name);
    }
  }
}

function collectFranchiseActiveServiceIds(
  record: FranchiseRelatedCatalogRecord
): Set<string> {
  const ids = new Set<string>();
  for (const doc of asObjectRecords(record.franchise_services)) {
    if (!Array.isArray(doc.active_services)) continue;
    for (const x of doc.active_services as unknown[]) {
      const id = str(x);
      if (id) ids.add(id);
    }
  }
  return ids;
}

function readFiniteNumber(
  row: Record<string, unknown>,
  key: string
): number | undefined {
  const n = Number(row[key]);
  return Number.isFinite(n) ? n : undefined;
}

/** Tax / commission / min-deposit fields from hydrated `service` or mapping row (for Add Quote breakdown). */
function quoteServiceFeeFieldsFromRow(
  inner: Record<string, unknown> | undefined,
  row: Record<string, unknown>
): Partial<ServiceDropDownOption> {
  const src =
    inner && typeof inner === "object" && Object.keys(inner).length > 0
      ? inner
      : row;
  const tax = readFiniteNumber(src, "tax") ?? readFiniteNumber(row, "tax");
  const commission =
    readFiniteNumber(src, "commission") ??
    readFiniteNumber(row, "commission");
  const minimum_deposit =
    readFiniteNumber(src, "minimum_deposit") ??
    readFiniteNumber(row, "minimum_deposit");
  const min_deposit_value =
    readFiniteNumber(src, "min_deposit_value") ??
    readFiniteNumber(row, "min_deposit_value") ??
    minimum_deposit;
  const min_deposit_type = str(
    (src.min_deposit_type as unknown) ??
      (src.payment_type as unknown) ??
      (row.min_deposit_type as unknown) ??
      (row.payment_type as unknown) ??
      ""
  );
  const out: Partial<ServiceDropDownOption> = {};
  if (tax !== undefined) out.tax = tax;
  if (commission !== undefined) out.commission = commission;
  if (minimum_deposit !== undefined) out.minimum_deposit = minimum_deposit;
  if (min_deposit_value !== undefined) out.min_deposit_value = min_deposit_value;
  if (min_deposit_type) out.min_deposit_type = min_deposit_type;
  return out;
}

function mergeServicesFromFranchiseServiceDocs(
  record: FranchiseRelatedCatalogRecord,
  catById: Map<string, string>,
  franchiseActiveSvcIds: Set<string>,
  seenSvc: Set<string>,
  out: ServiceDropDownOption[]
): void {
  const detailByServiceId = new Map<string, Record<string, unknown>>();
  for (const s of asObjectRecords(record.services)) {
    const inner = s.service as Record<string, unknown> | undefined;
    const sid = str(s.service_id ?? inner?._id ?? s._id ?? s.id);
    if (!sid) continue;
    detailByServiceId.set(sid, inner ?? s);
  }

  for (const doc of asObjectRecords(record.franchise_services)) {
    const list = doc.services_list;
    if (!Array.isArray(list)) {
      const inner = doc.service as Record<string, unknown> | undefined;
      const id = str(doc.service_id ?? inner?._id ?? doc._id);
      if (!id || seenSvc.has(id)) continue;
      if (doc.is_active === false || doc.is_active === 0) continue;
      const catRef = inner
        ? normalizeServiceCategoryRef(
            inner.category_id ?? inner.category ?? inner.categoryId
          )
        : normalizeServiceCategoryRef(
            doc.category_id ?? doc.category ?? doc.categoryId
          );
      const allow =
        !catRef ||
        catById.size === 0 ||
        catById.has(catRef) ||
        franchiseActiveSvcIds.has(id);
      if (!allow) continue;
      seenSvc.add(id);
      out.push({
        value: id,
        label: str(inner?.name ?? doc.name) || id,
        price: inner?.price != null ? Number(inner.price) : undefined,
        category_id: catRef || undefined,
        payment_type: str(
          inner?.payment_type ?? inner?.min_deposit_type ?? ""
        ),
        ...quoteServiceFeeFieldsFromRow(inner, doc as Record<string, unknown>),
      });
      continue;
    }
    const activeSet = new Set(
      Array.isArray(doc.active_services)
        ? (doc.active_services as unknown[]).map((x) => str(x)).filter(Boolean)
        : []
    );
    for (const row of asObjectRecords(list as unknown[])) {
      const sid = str(row.service_id ?? row._id ?? row.id);
      if (!sid || seenSvc.has(sid)) continue;
      if (activeSet.size > 0 && !activeSet.has(sid)) continue;
      if (row.is_active === false || row.is_active === 0) continue;
      const inner =
        (row.service as Record<string, unknown> | undefined) ??
        detailByServiceId.get(sid);
      const catRef = inner
        ? normalizeServiceCategoryRef(
            inner.category_id ?? inner.category ?? inner.categoryId
          )
        : "";
      const allow =
        !catRef ||
        catById.size === 0 ||
        catById.has(catRef) ||
        franchiseActiveSvcIds.has(sid);
      if (!allow) continue;
      seenSvc.add(sid);
      out.push({
        value: sid,
        label: str(inner?.name ?? row.name) || sid,
        price: inner?.price != null ? Number(inner.price) : undefined,
        category_id: catRef || undefined,
        payment_type: str(
          inner?.payment_type ?? inner?.min_deposit_type ?? ""
        ),
        ...quoteServiceFeeFieldsFromRow(
          inner ?? detailByServiceId.get(sid),
          row as Record<string, unknown>
        ),
      });
    }
  }
}

/**
 * Maps `related-catalog` payload into quote form dropdowns (categories, services, partners, employees, customers).
 * Supports hydrated `categories` / `services` / `customers` rows (staging) and mapping-doc shapes as fallback.
 */
export function mapRelatedCatalogToQuoteOptions(
  record: FranchiseRelatedCatalogRecord | null | undefined
): MappedFranchiseQuoteCatalog {
  const out: MappedFranchiseQuoteCatalog = {
    quoteCategoryOptions: [],
    quoteCatalogServices: [],
    quotePartnerRecords: [],
    quoteEmployeeOptions: [],
    quoteEmployeeRecords: [],
    quoteUserOptions: [],
    quoteCustomerRecords: [],
  };
  if (!record) return out;

  const catById = new Map<string, string>();

  for (const c of asObjectRecords(record.categories)) {
    const id = categoryIdFromHydratedRow(c);
    if (!id) continue;
    const rowActive = c.is_active !== false && c.is_active !== 0;
    if ("is_active" in c && !rowActive) continue;
    const nested = c.category as Record<string, unknown> | undefined;
    if (nested && "is_active" in nested) {
      const na = nested.is_active !== false && nested.is_active !== 0;
      if (!na) continue;
    }
    const name = categoryNameFromHydratedRow(c) || id;
    catById.set(id, name);
  }

  mergeCategoriesFromFranchiseCategoryDocs(record, catById);

  const franchiseActiveSvcIds = collectFranchiseActiveServiceIds(record);

  out.quoteCategoryOptions = Array.from(catById.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const seenSvc = new Set<string>();

  for (const s of asObjectRecords(record.services)) {
    const inner = s.service as Record<string, unknown> | undefined;
    const id = str(
      s.service_id ?? s._id ?? s.id ?? inner?._id ?? inner?.id
    );
    if (!id || seenSvc.has(id)) continue;
    const rowActive = s.is_active !== false && s.is_active !== 0;
    if ("is_active" in s && !rowActive) continue;
    const catRef = inner
      ? normalizeServiceCategoryRef(
          inner.category_id ?? inner.category ?? inner.categoryId
        )
      : normalizeServiceCategoryRef(
          s.category_id ?? s.category ?? s.categoryId
        );
    const allowSvc =
      !catRef ||
      catById.size === 0 ||
      catById.has(catRef) ||
      franchiseActiveSvcIds.has(id);
    if (!allowSvc) continue;
    seenSvc.add(id);
    out.quoteCatalogServices.push({
      value: id,
      label:
        str(inner?.name ?? inner?.service_name ?? s.name ?? s.service_name) ||
        id,
      price:
        inner?.price != null
          ? Number(inner.price)
          : s.price != null
          ? Number(s.price)
          : undefined,
      category_id: catRef || undefined,
      payment_type: str(
        inner?.payment_type ??
          inner?.min_deposit_type ??
          s.payment_type ??
          s.min_deposit_type ??
          ""
      ),
      ...quoteServiceFeeFieldsFromRow(
        inner,
        s as Record<string, unknown>
      ),
    });
  }

  if (!seenSvc.size) {
    mergeServicesFromFranchiseServiceDocs(
      record,
      catById,
      franchiseActiveSvcIds,
      seenSvc,
      out.quoteCatalogServices
    );
  }

  out.quoteCatalogServices.sort((a, b) => a.label.localeCompare(b.label));

  out.quotePartnerRecords = asObjectRecords(record.partners);

  for (const e of asObjectRecords(record.employees)) {
    const id = str(e._id ?? e.id);
    if (!id) continue;
    const active = e.is_active !== false && e.is_blocked !== true;
    if ("is_active" in e && e.is_active === false) continue;
    if (!active) continue;
    out.quoteEmployeeRecords.push(e);
    out.quoteEmployeeOptions.push({
      value: id,
      label: str(e.name ?? e.user_name ?? e.user_id) || id,
    });
  }
  out.quoteEmployeeOptions.sort((a, b) => a.label.localeCompare(b.label));

  out.quoteCustomerRecords = asObjectRecords(record.customers);

  for (const u of out.quoteCustomerRecords) {
    const id = str(u._id ?? u.id);
    if (!id) continue;
    const name = str(u.name) || id;
    const email = str(u.email);
    const label = email ? `${name} (${email})` : name;
    out.quoteUserOptions.push({ value: id, label, user_name: name });
  }
  out.quoteUserOptions.sort((a, b) =>
    a.user_name.localeCompare(b.user_name)
  );

  return out;
}

/**
 * Service ids a partner is configured to provide (`active_services_providing`, etc.).
 * Returns `null` when missing or empty ⇒ **no restriction** (use full franchise catalog).
 */
export function getPartnerProvidingServiceIdSet(
  partner: Record<string, unknown> | null | undefined
): Set<string> | null {
  if (!partner) return null;
  const raw =
    partner.active_services_providing ??
    partner.activeServicesProviding ??
    partner.services_providing;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out = new Set<string>();
  for (const x of raw as unknown[]) {
    if (x == null) continue;
    if (typeof x === "string" || typeof x === "number") {
      const id = str(x);
      if (id) out.add(id);
      continue;
    }
    if (typeof x === "object") {
      const o = x as Record<string, unknown>;
      const id = str(o.service_id ?? o._id ?? o.id);
      if (id) out.add(id);
    }
  }
  return out.size ? out : null;
}

/**
 * Category ids the partner can work in (`available_categories` on `related-catalog` partners).
 * Returns `null` when missing or empty ⇒ do not restrict categories beyond franchise + services.
 */
export function getPartnerAvailableCategoryIdSet(
  partner: Record<string, unknown> | null | undefined
): Set<string> | null {
  if (!partner) return null;
  const raw =
    partner.available_categories ?? partner.availableCategories;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out = new Set<string>();
  for (const x of raw as unknown[]) {
    if (x == null) continue;
    if (typeof x === "string" || typeof x === "number") {
      const id = str(x);
      if (id) out.add(id);
      continue;
    }
    if (typeof x === "object") {
      const o = x as Record<string, unknown>;
      const id = str(o._id ?? o.category_id ?? o.id);
      if (id) out.add(id);
    }
  }
  return out.size ? out : null;
}

/**
 * Category ids from `active_services_providing[].category_id` (and nested `service.category_id`).
 * Use with franchise catalog so quote UI matches what the partner actually offers.
 */
export function getPartnerCategoryIdsFromProviding(
  partner: Record<string, unknown> | null | undefined
): Set<string> {
  const out = new Set<string>();
  if (!partner) return out;
  const raw =
    partner.active_services_providing ??
    partner.activeServicesProviding ??
    partner.services_providing;
  if (!Array.isArray(raw)) return out;
  for (const x of raw as unknown[]) {
    if (x == null || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const direct = normalizeServiceCategoryRef(o.category_id);
    if (direct) out.add(direct);
    const svc = o.service as Record<string, unknown> | undefined;
    if (svc) {
      const ref = normalizeServiceCategoryRef(
        svc.category_id ?? svc.category ?? svc.categoryId
      );
      if (ref) out.add(ref);
    }
  }
  return out;
}

/** Resolves a Mongo-style id whether the API sends a string or a populated `{ _id }`. */
function normalizeMongoRef(v: unknown): string {
  if (v == null || v === undefined) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean")
    return str(v);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    return str(o._id ?? o.id ?? (o as { $oid?: unknown }).$oid);
  }
  return "";
}

function providingRowMatchesServiceId(
  o: Record<string, unknown>,
  sid: string
): boolean {
  if (!sid) return false;
  const ids = new Set<string>();
  const add = (v: unknown) => {
    const s = normalizeMongoRef(v);
    if (s) ids.add(s);
  };
  add(o.service_id);
  add(o.serviceId);
  add(o.id);
  add(o._id);
  const nested = o.service as Record<string, unknown> | undefined;
  if (nested && typeof nested === "object") {
    add(nested._id);
    add(nested.id);
    add(nested.service_id);
  }
  return ids.has(sid);
}

/** One row from `active_services_providing` for `serviceId`, if any. */
export function getPartnerActiveServiceProvidingRow(
  partner: Record<string, unknown> | null | undefined,
  serviceId: string | undefined | null
): Record<string, unknown> | null {
  const sid = str(serviceId);
  if (!partner || !sid) return null;
  const raw =
    partner.active_services_providing ??
    partner.activeServicesProviding ??
    partner.services_providing;
  if (!Array.isArray(raw)) return null;
  for (const x of raw as unknown[]) {
    if (x == null || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    if (providingRowMatchesServiceId(o, sid)) return o;
  }
  return null;
}

/**
 * Prefer partner `active_services_providing` for tax / minimum_deposit / commission
 * (see related-catalog partner rows); nested `service` is a fallback when the
 * global catalogue row omits those fields.
 */
export function mergeQuoteServiceFeesForBreakdown(
  catalogOpt: ServiceDropDownOption | undefined,
  partner: Record<string, unknown> | null | undefined,
  serviceId: string | undefined | null
): ServiceDropDownOption | undefined {
  const pr = getPartnerActiveServiceProvidingRow(partner, serviceId);
  if (!catalogOpt && !pr) return undefined;
  const base: ServiceDropDownOption =
    catalogOpt ?? { value: str(serviceId), label: "" };
  if (!pr) return catalogOpt;

  const nested = pr.service as Record<string, unknown> | undefined;

  const tax =
    readFiniteNumber(pr, "tax") ??
    (nested ? readFiniteNumber(nested, "tax") : undefined) ??
    base.tax;
  const commission =
    readFiniteNumber(pr, "commission") ??
    readFiniteNumber(pr, "admin_commission") ??
    (nested ? readFiniteNumber(nested, "commission") : undefined) ??
    (nested ? readFiniteNumber(nested, "admin_commission") : undefined) ??
    base.commission;
  const minimum_deposit =
    readFiniteNumber(pr, "minimum_deposit") ??
    (nested ? readFiniteNumber(nested, "minimum_deposit") : undefined) ??
    base.minimum_deposit;
  const min_deposit_value =
    readFiniteNumber(pr, "min_deposit_value") ??
    (nested ? readFiniteNumber(nested, "min_deposit_value") : undefined) ??
    minimum_deposit ??
    base.min_deposit_value;

  const pay = str(
    (pr.payment_type as unknown) ??
      (nested?.payment_type as unknown) ??
      ""
  );
  const mdType = str(
    (pr.min_deposit_type as unknown) ??
      (nested?.min_deposit_type as unknown) ??
      ""
  );

  const out: ServiceDropDownOption = { ...base };
  if (tax !== undefined) out.tax = tax;
  if (commission !== undefined) out.commission = commission;
  if (minimum_deposit !== undefined) out.minimum_deposit = minimum_deposit;
  if (min_deposit_value !== undefined) out.min_deposit_value = min_deposit_value;
  if (mdType) {
    out.min_deposit_type = mdType;
  } else if (pay) {
    out.min_deposit_type = pay;
  }
  if (pay) {
    out.payment_type = pay;
  }
  return out;
}

export type QuoteScheduleMetrics = {
  from_date: string;
  to_date: string;
  work_start_time: string;
  work_end_time: string;
  work_hours_per_day: number;
  days: number;
  total_work_hours: number;
};

/**
 * Same schedule math as create-quote (`from_date` / `to_date` / work hours).
 * Used for automatic price = partner unit rate × duration.
 */
export function deriveQuoteScheduleMetrics(input: {
  scheduleMode: QuoteServiceScheduleMode;
  requested_date: string;
  requested_date_to: string;
  requested_time: string;
  requested_time_from: string;
  requested_time_to: string;
}): QuoteScheduleMetrics | null {
  const from_date = str(input.requested_date);
  if (!from_date) return null;

  let to_date = str(input.requested_date_to) || from_date;
  if (input.scheduleMode === "range") {
    to_date = str(input.requested_date_to) || from_date;
  } else {
    to_date = from_date;
  }

  let work_start_time = "09:00";
  let work_end_time = "17:00";
  if (input.scheduleMode === "hourly") {
    work_start_time = timeStorageToHHmm(input.requested_time_from);
    work_end_time = timeStorageToHHmm(input.requested_time_to);
  } else if (input.scheduleMode === "range") {
    const wf = str(input.requested_time_from);
    const wt = str(input.requested_time_to);
    if (wf && wt) {
      work_start_time = timeStorageToHHmm(wf);
      work_end_time = timeStorageToHHmm(wt);
    } else {
      work_start_time = timeStorageToHHmm(input.requested_time);
      const [h, m] = work_start_time.split(":").map((x) => parseInt(x, 10));
      const endH = Math.min(23, (h || 9) + 2);
      work_end_time = `${pad2(endH)}:${pad2(m || 0)}`;
    }
  } else if (input.scheduleMode === "single") {
    const wf = str(input.requested_time_from);
    const wt = str(input.requested_time_to);
    if (wf && wt) {
      work_start_time = timeStorageToHHmm(wf);
      work_end_time = timeStorageToHHmm(wt);
    } else {
      work_start_time = timeStorageToHHmm(input.requested_time);
      const [h, m] = work_start_time.split(":").map((x) => parseInt(x, 10));
      const endH = Math.min(23, (h || 9) + 2);
      work_end_time = `${pad2(endH)}:${pad2(m || 0)}`;
    }
  } else {
    work_start_time = timeStorageToHHmm(input.requested_time_from);
    work_end_time = timeStorageToHHmm(input.requested_time_to);
  }

  const work_hours_per_day = hoursBetweenHHmm(work_start_time, work_end_time);
  const days = daysInclusive(from_date, to_date);
  const total_work_hours = Math.round(work_hours_per_day * days * 10) / 10;
  return {
    from_date,
    to_date,
    work_start_time,
    work_end_time,
    work_hours_per_day,
    days,
    total_work_hours,
  };
}

/**
 * Suggested **pre-tax** service total from partner line (`price`, `payment_type`) × schedule.
 * Tax is shown in the Add Quote breakdown only; do not bake tax into this amount (avoids double counting with the breakdown).
 */
export function computeAutoQuotePriceFromPartner(
  partnerServiceRow: Record<string, unknown> | null | undefined,
  metrics: QuoteScheduleMetrics
): number {
  if (!partnerServiceRow) return 0;
  const unit = Number(partnerServiceRow.price ?? 0);
  if (!Number.isFinite(unit)) return 0;
  const key = extractMinDepositTypeKey(str(partnerServiceRow.payment_type));
  let sub = 0;
  if (key === "per_hour") {
    sub = unit * metrics.total_work_hours;
  } else if (key === "per_day") {
    sub = unit * metrics.days;
  } else if (key === "per_month") {
    const months = Math.max(1, Math.ceil(metrics.days / 30));
    sub = unit * months;
  } else if (key === "per_consultancy") {
    sub = unit;
  } else {
    sub = unit * metrics.days;
  }
  return Math.max(0, Math.round(sub * 100) / 100);
}

export type QuoteSchedulePricePreview = {
  billingLabel: string;
  primaryLine: string;
  secondaryLine?: string;
  preTaxTotal: number;
};

/**
 * One-line pre-tax total explanation for Add Quote (matches `computeAutoQuotePriceFromPartner`).
 */
export function buildQuoteSchedulePricePreview(
  partnerServiceRow: Record<string, unknown> | null | undefined,
  metrics: QuoteScheduleMetrics | null,
  currencySymbol: string
): QuoteSchedulePricePreview | null {
  if (!partnerServiceRow || !metrics) return null;
  const unit = Number(partnerServiceRow.price ?? 0);
  if (!Number.isFinite(unit) || unit < 0) return null;
  const rawType = str(partnerServiceRow.payment_type);
  const key = extractMinDepositTypeKey(rawType);
  const billingLabel = labelForMinDepositType(rawType) || key || "Billing";
  const sym = currencySymbol;
  const fmt = (n: number) =>
    `${sym}${String(Math.round(n * 100) / 100).replace(/\.00$/, "")}`;

  if (key === "per_hour") {
    const totalH = metrics.total_work_hours;
    const sub = unit * totalH;
    return {
      billingLabel,
      primaryLine: `${fmt(unit)}/hr × ${totalH} h = ${fmt(sub)}`,
      secondaryLine: `${metrics.work_hours_per_day} h/day × ${metrics.days} day(s)`,
      preTaxTotal: Math.max(0, Math.round(sub * 100) / 100),
    };
  }
  if (key === "per_day") {
    const d = metrics.days;
    const sub = unit * d;
    return {
      billingLabel,
      primaryLine: `${fmt(unit)}/day × ${d} day(s) = ${fmt(sub)}`,
      secondaryLine: `${metrics.work_start_time}–${metrics.work_end_time} each day`,
      preTaxTotal: Math.max(0, Math.round(sub * 100) / 100),
    };
  }
  if (key === "per_month") {
    const months = Math.max(1, Math.ceil(metrics.days / 30));
    const sub = unit * months;
    return {
      billingLabel,
      primaryLine: `${fmt(unit)}/month × ${months} month(s) = ${fmt(sub)}`,
      secondaryLine: `${metrics.days} day(s) in range · ${metrics.work_start_time}–${metrics.work_end_time} daily`,
      preTaxTotal: Math.max(0, Math.round(sub * 100) / 100),
    };
  }
  if (key === "per_consultancy") {
    const sub = unit;
    return {
      billingLabel,
      primaryLine: `${fmt(unit)} × 1 = ${fmt(sub)}`,
      secondaryLine: `${metrics.work_start_time}–${metrics.work_end_time}`,
      preTaxTotal: Math.max(0, Math.round(sub * 100) / 100),
    };
  }
  const d = metrics.days;
  const sub = unit * d;
  return {
    billingLabel,
    primaryLine: `${fmt(unit)}/day × ${d} day(s) = ${fmt(sub)}`,
    secondaryLine: `${metrics.work_start_time}–${metrics.work_end_time} each day`,
    preTaxTotal: Math.max(0, Math.round(sub * 100) / 100),
  };
}

export function filterCatalogPartnerRecordsByService(
  partners: Record<string, unknown>[],
  serviceId: string | undefined
): Record<string, unknown>[] {
  const sid = str(serviceId);
  if (!sid || !partners.length) return partners;

  const rowMatches = (p: Record<string, unknown>): boolean => {
    const direct = str(p.service_id ?? p.serviceId);
    if (direct && direct === sid) return true;
    const raw =
      p.services ??
      p.service_ids ??
      p.partner_services ??
      p.my_services ??
      p.service_list;
    if (Array.isArray(raw)) {
      return raw.some((x) => {
        if (x == null) return false;
        if (typeof x === "string" || typeof x === "number")
          return str(x) === sid;
        if (typeof x === "object") {
          const o = x as Record<string, unknown>;
          return str(o.service_id ?? o._id ?? o.id) === sid;
        }
        return false;
      });
    }
    if (typeof raw === "string" && raw.includes(sid)) return true;
    return false;
  };

  const filtered = partners.filter(rowMatches);
  return filtered.length ? filtered : partners;
}

/**
 * Set to `true` for in-memory mock rows (no network).
 * Set to `false` to use live APIs under `/api/quote/*` (see Help-PR-Area-Franchise-Subscription Postman collection).
 */
const USE_MOCK_QUOTE_API = false;

/** `GET /user/getDropDown?type=4` — customers / end users (see `APP_USER_TYPE` in `userService`). */
const CUSTOMER_USER_TYPE = APP_USER_TYPE.CUSTOMER;
/** `GET /user/getDropDown?type=3` — franchise employees. */
const EMPLOYEE_USER_TYPE = APP_USER_TYPE.FRANCHISE_EMPLOYEE;
/** `GET /user/getDropDown?type=2` — partners (fallback when `getPartnerDropDown` is empty). */
const PARTNER_USER_TYPE = APP_USER_TYPE.PARTNER;

const QUOTE_SORTABLE_ACCESSORS = new Set([
  "quote_id",
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

function str(v: unknown): string {
  if (v == null) return "";
  const s = String(v).trim();
  return s === "undefined" || s === "null" || s === "[object Object]" ? "" : s;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

/** Populated ref `{ _id, name, ... }` or raw id string/number. */
function refId(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return str(v);
  if (isPlainObject(v)) return str(v._id);
  return "";
}

function nestedObj(v: unknown): Record<string, unknown> | undefined {
  return isPlainObject(v) ? v : undefined;
}

/** API `from_date` / `to_date` may be full ISO; normalize to `YYYY-MM-DD` for schedule UI. */
function isoOrDateToYmd(input: string): string {
  const t = str(input);
  if (!t) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return t;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Convert `2000-01-01THH:mm:00` storage to `HH:mm` (24h). */
export function timeStorageToHHmm(storage: string | null | undefined): string {
  const t = str(storage);
  if (!t) return "09:00";
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return "09:00";
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** `"2:30 PM"` style → `HH:mm` */
export function amPmDisplayToHHmm(label: string | undefined | null): string {
  const t = str(label);
  if (!t || t === "-") return "";
  const m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return "";
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3].toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return `${pad2(h)}:${pad2(min)}`;
}

function daysInclusive(fromYmd: string, toYmd: string): number {
  const a = new Date(fromYmd + "T12:00:00");
  const b = new Date(toYmd + "T12:00:00");
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 1;
  const diff = Math.round((b.getTime() - a.getTime()) / 86400000);
  return Math.max(1, diff + 1);
}

function hoursBetweenHHmm(start: string, end: string): number {
  const [sh, sm] = start.split(":").map((x) => parseInt(x, 10));
  const [eh, em] = end.split(":").map((x) => parseInt(x, 10));
  if (!Number.isFinite(sh) || !Number.isFinite(eh)) return 8;
  const t0 = sh * 60 + (sm || 0);
  const t1 = eh * 60 + (em || 0);
  const diff = (t1 - t0) / 60;
  return Math.max(1, Number.isFinite(diff) ? diff : 8);
}

/** Backend may send tab status as number (`1` = New, etc.) or string. */
function formatStatusLabel(raw: unknown): string {
  const byNumber: Record<number, string> = {
    1: "New",
    2: "Pending",
    3: "Accepted",
    4: "Success",
    5: "Failed",
  };
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const lab = byNumber[raw];
    if (lab) return lab;
  }
  const s = str(raw);
  const byDigit: Record<string, string> = {
    "1": "New",
    "2": "Pending",
    "3": "Accepted",
    "4": "Success",
    "5": "Failed",
  };
  if (byDigit[s]) return byDigit[s];
  const k = s.toLowerCase();
  const map: Record<string, string> = {
    new: "New",
    pending: "Pending",
    accepted: "Accepted",
    success: "Success",
    failed: "Failed",
  };
  return map[k] || (s ? s.charAt(0).toUpperCase() + s.slice(1) : "New");
}

function extractPagedRecords(data: any): {
  records: unknown[];
  totalPages: number;
  totalCount: number;
} {
  const d = data ?? {};
  const inner = d.data ?? d;
  const records = Array.isArray(inner.records)
    ? inner.records
    : Array.isArray(d.records)
    ? d.records
    : [];
  const totalPages = Number(inner.totalPages ?? d.totalPages ?? 0) || 0;
  const rawTotal =
    inner.totalItems ??
    inner.total_count ??
    inner.totalCount ??
    inner.total ??
    inner.count ??
    d.totalItems ??
    d.total_count ??
    d.totalCount;
  let totalCount = Number(rawTotal);
  if (!Number.isFinite(totalCount) || totalCount < 0) totalCount = 0;
  return { records, totalPages, totalCount };
}

export function mapServerQuoteRecord(r: Record<string, unknown>): QuoteRow {
  const mongoId = str(r._id);

  const userRef = nestedObj(r.user_id) ?? nestedObj(r.user);
  const partnerRef = nestedObj(r.partner_id) ?? nestedObj(r.partner);
  const employeeRef = nestedObj(r.employee_id);
  const franchiseRef = nestedObj(r.franchise_id);
  const categoryRef = nestedObj(r.category_id) ?? nestedObj(r.category);
  const serviceRef = nestedObj(r.service_id) ?? nestedObj(r.service);
  const addressRef =
    nestedObj(r.address_id) ??
    nestedObj(r.address) ??
    nestedObj(r.user_address);

  const quoteId =
    str(
      r.quote_sequence_id ??
        r.quote_id ??
        r.quoteId ??
        r.quote_number ??
        r.reference
    ) || mongoId;

  const requested_services = str(
    r.service_name ??
      r.requested_services ??
      serviceRef?.name ??
      r.name ??
      ""
  );

  const fromD = isoOrDateToYmd(str(r.from_date ?? r.fromDate ?? ""));
  const toD = isoOrDateToYmd(str(r.to_date ?? r.toDate ?? ""));
  let requested_date = str(r.requested_date);
  if (!requested_date && (fromD || toD)) {
    if (fromD && toD && fromD !== toD) requested_date = `${fromD} to ${toD}`;
    else requested_date = fromD || toD;
  }

  const ws = str(r.work_start_time ?? r.workStartTime);
  const we = str(r.work_end_time ?? r.workEndTime);
  let requested_time = str(r.requested_time);
  if (!requested_time && ws && we) {
    requested_time = `${ws} to ${we}`;
  } else if (!requested_time && ws) {
    requested_time = ws;
  }
  if (!requested_time) requested_time = "-";

  const partnerName = str(
    r.partner_name ??
      r.requested_partner ??
      partnerRef?.name ??
      partnerRef?.partner_name
  );
  const requested_partner =
    str(r.requested_partner) || partnerName || refId(r.partner_id);

  const status = formatStatusLabel(r.status ?? r.quote_status ?? "new");

  const user_name = str(
    r.user_name ?? userRef?.name ?? r.customer_name ?? ""
  );
  const user_id = refId(r.user_id) || refId(r.user);

  const addr = addressRef ?? {};
  const cityIdObj = nestedObj(addr.city_id);
  const door_no = str(addr.door_no ?? addr.door_number ?? r.door_no);
  const streetCombined = str(
    addr.street ?? addr.street_name ?? addr.address ?? r.street
  );
  const city = str(
    addr.city ??
      addr.city_name ??
      cityIdObj?.name ??
      r.city ??
      r.user_city
  );
  const area = str(addr.area ?? addr.area_name ?? r.area);
  const landmark = str(addr.landmark ?? r.landmark);
  const pincode = str(addr.pincode ?? r.pincode);

  return {
    _id: mongoId || quoteId,
    quote_id: quoteId,
    requested_services,
    requested_partner,
    partner_name: partnerName || undefined,
    employee_id: refId(r.employee_id) || str(r.employeeId) || undefined,
    employee_name:
      str(r.employee_name ?? r.employeeName ?? employeeRef?.name) || undefined,
    employee_phone:
      str(
        r.employee_phone ??
          r.employeePhone ??
          employeeRef?.phone_number
      ) || undefined,
    user_name,
    door_no,
    street: streetCombined,
    city,
    requested_date,
    requested_time,
    service_price:
      r.service_price != null ? Number(r.service_price) : undefined,
    scheduled_date: str(
      r.scheduled_date ?? r.scheduledDate ?? r.scheduled_service_date
    ),
    service_from_time: str(
      r.scheduled_time_from ??
        r.service_from_time ??
        r.scheduled_start_time
    ),
    service_to_time: str(
      r.scheduled_time_to ?? r.service_to_time ?? r.scheduled_end_time
    ),
    order_id: str(r.order_id ?? r.orderId) || undefined,
    services: str(r.services ?? r.service_summary) || undefined,
    order_status: str(r.order_status) || undefined,
    payment_method: str(r.payment_method) || undefined,
    payment_status: str(r.payment_status) || undefined,
    payment_reference: str(r.payment_reference) || undefined,
    payment_date: str(r.payment_date) || undefined,
    status,
    user_id: user_id || undefined,
    phone_number:
      str(
        r.phone_number ??
          userRef?.phone_number ??
          r.user_phone ??
          addr.contact_number
      ) || undefined,
    user_email: str(r.user_email ?? userRef?.email) || undefined,
    user_city: str(r.user_city ?? userRef?.city_name ?? city) || undefined,
    profile_url: (() => {
      const s = str(r.profile_url ?? userRef?.profile_url);
      return s || null;
    })(),
    category_id: refId(r.category_id) || refId(categoryRef) || undefined,
    category_name: str(r.category_name ?? categoryRef?.name) || undefined,
    area: area || undefined,
    landmark: landmark || undefined,
    pincode: pincode || undefined,
    service_id: refId(r.service_id) || refId(serviceRef) || undefined,
    partner_id: refId(r.partner_id) || refId(partnerRef) || undefined,
    partner_user_id:
      str(r.partner_user_id ?? partnerRef?.user_id) || undefined,
    partner_phone: str(r.partner_phone ?? partnerRef?.phone_number) || undefined,
    partner_city: str(r.partner_city ?? partnerRef?.city_name) || undefined,
    partner_email: str(r.partner_email ?? partnerRef?.email) || undefined,
    franchise_id: refId(r.franchise_id) || refId(franchiseRef) || undefined,
    franchise_name:
      str(r.franchise_name ?? franchiseRef?.name ?? franchiseRef?.franchise_name) ||
      undefined,
    address_id: refId(r.address_id) || refId(addressRef) || undefined,
    employee_email:
      str(r.employee_email ?? employeeRef?.email) || undefined,
    description:
      str(
        r.customer_description ??
          r.description ??
          r.quote_description ??
          r.notes
      ) || undefined,
  };
}

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
    row.category_name,
    row.phone_number,
    row.service_price != null ? String(row.service_price) : "",
    `${row.door_no}, ${row.street}, ${row.area ?? ""}, ${row.city}`,
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
      return [row.door_no, row.street, row.area, row.city, row.pincode]
        .filter(Boolean)
        .join(", ");
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

  const fidRaw = str(filters.franchise_id);
  const fid =
    sessionMayUseFranchiseIdApiFilter() && fidRaw ? fidRaw : "";
  const params = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
    tab,
    ...(filters.keyword ? { keyword: filters.keyword } : {}),
    ...(filters.from_date ? { from_date: filters.from_date } : {}),
    ...(filters.to_date ? { to_date: filters.to_date } : {}),
    ...(fid ? { franchise_id: fid } : {}),
  });

  const safeSort = normalizeQuoteListSort(sort);
  const primarySort = safeSort[0];
  if (primarySort) {
    params.set("sort_by", primarySort.id);
    params.set("sort_order", primarySort.desc ? "desc" : "asc");
  }

  const res = await apiRequest(
    `${ApiPaths.GET_QUOTES()}?${params.toString()}`,
    "GET",
    undefined,
    false,
    true,
    false
  );

  if (!res.success)
    return { response: false, quotes: [], totalPages: 0, totalCount: 0 };

  const { records, totalPages, totalCount: tc } = extractPagedRecords(
    res.data
  );
  let totalCount = tc;
  const quotes = records.map((row) =>
    mapServerQuoteRecord(row as Record<string, unknown>)
  );

  if (!Number.isFinite(totalCount) || totalCount < 0) {
    totalCount =
      totalPages > 0 && page === totalPages
        ? (totalPages - 1) * pageSize + quotes.length
        : quotes.length;
  }

  return { response: true, quotes, totalPages, totalCount };
}

export async function fetchQuoteServiceOptionsForCategory(
  categoryId: string | null | undefined
): Promise<ServiceDropDownOption[]> {
  const cid = str(categoryId);
  if (!cid) return [];

  if (USE_MOCK_QUOTE_API) {
    const names = new Set<string>();
    for (const row of quoteListMockData.records) {
      if (str(row.category_id) !== cid) continue;
      const raw = str(row.requested_services);
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

  return fetchServiceDropDown(cid);
}

/**
 * Loads Add Quote static dropdowns (aligned with Help-PR Postman “Quote” create body sources):
 * `GET /category/getDropDown`, `GET /user/getDropDown?type=4` (customers), `GET /user/getDropDown?type=3` (employees).
 * When `franchiseId` is set (super admin / staff after choosing **Franchise**), adds `franchise_id` to user dropdowns so lists match that franchise.
 */
export async function fetchQuoteCreateOptions(opts?: {
  franchiseId?: string;
}): Promise<{
  quotePartnerOptions: OptionType[];
  quoteUserOptions: QuoteUserOption[];
  quoteEmployeeOptions: OptionType[];
  quoteCategoryOptions: OptionType[];
}> {
  if (USE_MOCK_QUOTE_API) {
    const allMock = quoteListMockData.records;

    const partners = Array.from(
      new Set(
        allMock
          .map((row) => str(row.requested_partner || row.partner_name))
          .filter(Boolean)
      )
    );

    const userById = new Map<string, QuoteUserOption>();
    for (const row of allMock) {
      const uid = str(row.user_id);
      if (!uid) continue;
      const name = str(row.user_name) || uid;
      const phone = str(row.phone_number);
      const label = phone ? `${name} (${phone})` : name;
      if (!userById.has(uid)) {
        userById.set(uid, { value: uid, label, user_name: name });
      }
    }

    const employeeById = new Map<string, OptionType>();
    for (const row of allMock) {
      const eid = str(row.employee_id);
      if (!eid) continue;
      const ename = str(row.employee_name) || eid;
      if (!employeeById.has(eid)) {
        employeeById.set(eid, { value: eid, label: ename });
      }
    }

    const categoryById = new Map<string, OptionType>();
    for (const row of allMock) {
      const cid = str(row.category_id);
      if (!cid) continue;
      const cname = str(row.category_name) || cid;
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

  const extra = opts?.franchiseId
    ? { franchise_id: String(opts.franchiseId).trim() }
    : undefined;
  const [quoteCategoryOptions, customers, employees] = await Promise.all([
    fetchCategoryDropDown(),
    fetchUserDropDown(CUSTOMER_USER_TYPE, undefined, extra),
    fetchUserDropDown(EMPLOYEE_USER_TYPE, undefined, extra),
  ]);

  const quoteUserOptions: QuoteUserOption[] = (customers.users ?? []).map(
    (u: any) => {
      const name = str(u.name) || str(u._id);
      const phone = str(u.phone_number);
      const label = phone ? `${name} (${phone})` : name;
      return {
        value: str(u._id),
        label,
        user_name: name,
      };
    }
  );

  const quoteEmployeeOptions: OptionType[] = (employees.users ?? []).map(
    (u: any) => ({
      value: str(u._id),
      label: str(u.name) || str(u._id),
    })
  );

  return {
    quotePartnerOptions: [],
    quoteUserOptions: quoteUserOptions.sort((a, b) =>
      a.user_name.localeCompare(b.user_name)
    ),
    quoteEmployeeOptions: quoteEmployeeOptions.sort((a, b) =>
      a.label.localeCompare(b.label)
    ),
    quoteCategoryOptions,
  };
}

export async function fetchQuotePartnerDropDown(serviceId?: string): Promise<{
  partners: Array<any>;
}> {
  if (USE_MOCK_QUOTE_API) {
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

  // Prefer `GET /user/getPartnerDropDown?service_id=…` (Postman); fall back to `GET /user/getDropDown?type=2&service_id=…`.
  const sid = str(serviceId);
  const fromPartnerApi = await fetchPartnerDropDown(sid || undefined);
  if (fromPartnerApi.partners?.length) {
    return { partners: fromPartnerApi.partners };
  }
  const { users } = await fetchUserDropDown(PARTNER_USER_TYPE, sid || undefined);
  return { partners: users };
}

async function quoteMutation(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown
): Promise<boolean> {
  const res = await apiRequest(
    path,
    method,
    body === undefined ? undefined : body,
    false,
    false,
    false,
    true
  );
  return Boolean(res.success);
}

export async function fetchQuoteById(
  quoteMongoId: string
): Promise<QuoteRow | null> {
  const id = str(quoteMongoId);
  if (!id) return null;
  const res = await apiRequest(
    ApiPaths.GET_QUOTE_BY_ID(id),
    "GET",
    undefined,
    false,
    true,
    true
  );
  if (!res.success) return null;
  const raw =
    (res.data as any)?.record ??
    (res.data as any)?.data?.record ??
    (res.data as any)?.data;
  if (!raw || typeof raw !== "object") return null;
  return mapServerQuoteRecord(raw as Record<string, unknown>);
}

export async function fetchCustomerQuotes(
  userId: string
): Promise<QuoteRow[]> {
  const uid = str(userId);
  if (!uid) return [];
  const res = await apiRequest(
    `${ApiPaths.GET_QUOTE_CUSTOMER_QUOTES()}?user_id=${encodeURIComponent(
      uid
    )}`,
    "GET",
    undefined,
    false,
    true,
    true
  );
  if (!res.success) return [];
  const { records } = extractPagedRecords(res.data);
  return records.map((r) => mapServerQuoteRecord(r as Record<string, unknown>));
}

/** POST `/quote/create` — `service_price` is the scheduled service total only (Add Quote breakdown is UI-only). */
export type CreateQuoteBody = {
  user_id: string;
  category_id: string;
  service_id: string;
  partner_id?: string;
  employee_id?: string;
  service_price: number;
  franchise_id: string;
  address_id: string;
  created_by_id: string;
  from_date: string;
  to_date: string;
  work_hours_per_day: number;
  total_work_hours: number;
  work_start_time: string;
  work_end_time: string;
  description?: string;
};

export async function createQuote(body: CreateQuoteBody): Promise<boolean> {
  return quoteMutation("POST", ApiPaths.CREATE_QUOTE(), body);
}

export async function updateQuote(
  quoteMongoId: string,
  patch: Record<string, unknown>
): Promise<boolean> {
  const id = str(quoteMongoId);
  if (!id) return false;
  return quoteMutation("PUT", ApiPaths.UPDATE_QUOTE(id), patch);
}

export async function approveQuote(quoteMongoId: string): Promise<boolean> {
  const id = str(quoteMongoId);
  if (!id) return false;
  return quoteMutation("PUT", ApiPaths.APPROVE_QUOTE(id));
}

export async function rejectQuote(
  quoteMongoId: string,
  rejection_reason: string
): Promise<boolean> {
  const id = str(quoteMongoId);
  if (!id) return false;
  return quoteMutation("PUT", ApiPaths.REJECT_QUOTE(id), {
    rejection_reason: str(rejection_reason) || "Rejected",
  });
}

export async function cancelQuote(
  quoteMongoId: string,
  cancellation_reason: string
): Promise<boolean> {
  const id = str(quoteMongoId);
  if (!id) return false;
  return quoteMutation("PUT", ApiPaths.CANCEL_QUOTE(id), {
    cancellation_reason: str(cancellation_reason) || "Cancelled",
  });
}

export async function convertQuoteToOrder(
  quoteMongoId: string
): Promise<boolean> {
  const id = str(quoteMongoId);
  if (!id) return false;
  return quoteMutation("POST", ApiPaths.CONVERT_QUOTE(id));
}

export async function deleteQuote(quoteMongoId: string): Promise<boolean> {
  const id = str(quoteMongoId);
  if (!id) return false;
  return quoteMutation("DELETE", ApiPaths.DELETE_QUOTE(id));
}

/** Applies price / status from the quote header editor (approve / reject / update). */
export async function applyQuoteHeaderPatch(
  quoteMongoId: string,
  patch: { service_price?: number; status?: string }
): Promise<boolean> {
  const id = str(quoteMongoId);
  if (!id) return false;

  if (patch.service_price != null) {
    const ok = await updateQuote(id, { service_price: patch.service_price });
    if (!ok) return false;
  }

  if (patch.status != null) {
    const sk = patch.status.trim().toLowerCase();
    if (sk === "accepted") {
      const ok = await approveQuote(id);
      if (!ok) return false;
    } else if (sk === "failed") {
      const ok = await rejectQuote(id, "Marked as failed");
      if (!ok) return false;
    } else {
      const body: Record<string, unknown> = { status: sk };
      const ok = await updateQuote(id, body);
      if (!ok) return false;
    }
  }

  return true;
}

export async function applyQuoteSchedulePatch(
  quoteMongoId: string,
  patch: {
    scheduled_date: string;
    scheduled_time_from: string;
    scheduled_time_to: string;
    status: string;
  }
): Promise<boolean> {
  const id = str(quoteMongoId);
  if (!id) return false;

  const ymd =
    patch.scheduled_date.length >= 10
      ? patch.scheduled_date.slice(0, 10)
      : patch.scheduled_date;
  const ws = amPmDisplayToHHmm(patch.scheduled_time_from);
  const we = amPmDisplayToHHmm(patch.scheduled_time_to);
  if (!ymd || !ws || !we) return false;

  const perDay = hoursBetweenHHmm(ws, we);
  const total = perDay;

  return updateQuote(id, {
    from_date: ymd,
    to_date: ymd,
    work_start_time: ws,
    work_end_time: we,
    work_hours_per_day: perDay,
    total_work_hours: total,
    ...(patch.status ? { status: patch.status.trim().toLowerCase() } : {}),
  });
}

export async function updateQuotePartner(
  quoteMongoId: string,
  partner_id: string
): Promise<boolean> {
  const id = str(quoteMongoId);
  if (!id || !str(partner_id)) return false;
  return updateQuote(id, { partner_id: str(partner_id) });
}

export async function updateQuoteEmployee(
  quoteMongoId: string,
  employee_id: string
): Promise<boolean> {
  const id = str(quoteMongoId);
  if (!id || !str(employee_id)) return false;
  return updateQuote(id, { employee_id: str(employee_id) });
}

/** Resolve `franchise_id` for create quote (franchise users vs admin). */
export function resolveFranchiseIdForQuoteForm(
  selectedFranchiseId: string | undefined | null
): string {
  const role = getLocalStorage(AppConstant.userRole);
  const selected = str(selectedFranchiseId);
  if (
    role === UserRole.FRANCHISE_ADMIN ||
    role === UserRole.EMPLOYEE
  ) {
    return str(getLocalStorage(AppConstant.partnerId)) || selected;
  }
  return selected;
}

export function buildCreateQuotePayload(input: {
  user_id: string;
  category_id: string;
  service_id: string;
  partner_id?: string;
  employee_id?: string;
  service_price: number;
  franchise_id: string;
  address_id: string;
  scheduleMode: QuoteServiceScheduleMode;
  requested_date: string;
  requested_date_to: string;
  requested_time: string;
  requested_time_from: string;
  requested_time_to: string;
  description?: string;
}): CreateQuoteBody | null {
  const created_by_id = str(getLocalStorage(AppConstant.createdById));
  const franchise_id = str(input.franchise_id);
  const user_id = str(input.user_id);
  const category_id = str(input.category_id);
  const service_id = str(input.service_id);
  if (!user_id || !category_id || !service_id || !franchise_id || !created_by_id)
    return null;

  const metrics = deriveQuoteScheduleMetrics({
    scheduleMode: input.scheduleMode,
    requested_date: input.requested_date,
    requested_date_to: input.requested_date_to,
    requested_time: input.requested_time,
    requested_time_from: input.requested_time_from,
    requested_time_to: input.requested_time_to,
  });
  if (!metrics) return null;

  const desc = str(input.description);
  return {
    user_id,
    category_id,
    service_id,
    partner_id: str(input.partner_id) || undefined,
    employee_id: str(input.employee_id) || undefined,
    service_price: input.service_price,
    franchise_id,
    address_id: str(input.address_id),
    created_by_id,
    from_date: metrics.from_date,
    to_date: metrics.to_date,
    work_hours_per_day: metrics.work_hours_per_day,
    total_work_hours: metrics.total_work_hours,
    work_start_time: metrics.work_start_time,
    work_end_time: metrics.work_end_time,
    ...(desc ? { description: desc } : {}),
  };
}
