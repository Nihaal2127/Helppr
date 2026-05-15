import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, UseFormRegister } from "react-hook-form";
import { Button, Col, Form, InputGroup, Modal, Row } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import CustomTextField from "../../components/CustomTextField";
import CustomTextFieldDatePicket from "../../components/CustomTextFieldDatePicket";
import CustomTextFieldSelect from "../../components/CustomTextFieldSelect";
import CustomTextFieldTimePicket from "../../components/CustomTextFieldTimePicket";
import { openDialog } from "../../lib/global/DialogManager";
import { showErrorAlert, showSuccessAlert } from "../../lib/global/alertHelper";
import { AppConstant, UserRole } from "../../lib/global/AppConstant";
import { getLocalStorage } from "../../lib/global/localStorageHelper";
import type { OptionType, QuoteUserOption } from "../../services/quoteService";
import {
  applyQuoteHeaderPatch,
  buildQuoteSchedulePricePreview,
  computeAutoQuotePriceFromPartner,
  deriveQuoteScheduleMetrics,
  fetchFranchiseRelatedCatalog,
  fetchQuoteDetailById,
  getPartnerActiveServiceProvidingRow,
  getPartnerAvailableCategoryIdSet,
  getPartnerCategoryIdsFromProviding,
  getPartnerProvidingServiceIdSet,
  getQuoteScheduleModeFromServiceOption,
  mapRelatedCatalogToQuoteOptions,
  mergeQuoteServiceFeesForBreakdown,
  resolveFranchiseIdForQuoteForm,
  updateQuote,
} from "../../services/quoteService";
import type { ServiceDropDownOption } from "../../services/servicesService";
import { normalizeServiceCategoryRef } from "../../services/servicesService";
import type { AddQuoteFormValues, QuoteRow } from "../../lib/types/quoteTypes";
import { setQuoteFranchiseCatalogSnapshot } from "../../lib/quote/quoteFranchiseCatalogStore";
import {
  buildFranchisePincodeSetFromRelatedCatalog,
  collectFranchiseAreaIds,
} from "../../lib/quote/quoteFranchisePins";
import { seedEditQuoteFormFromRow } from "../../lib/quote/quoteEditFormSeed";
import type { EditQuoteFormValues } from "../../lib/quote/quoteEditFormSeed";
import { useQuoteCustomerAddressPanel } from "../../lib/quote/useQuoteCustomerAddressPanel";
import type { QuoteAddressRowUi } from "../../lib/quote/useQuoteCustomerAddressPanel";
import { computeQuotePriceBreakdown } from "../../lib/quote/quotePriceBreakdown";
import QuotePriceBreakdownPanel from "../../components/quote/QuotePriceBreakdownPanel";
import { partnerCatalogControlStyle } from "../../components/partnerCatalogBlockUi";
import { QUOTE_MODAL_LAYOUT } from "../../lib/quote/quoteModalLayout";

const toTimeStorageFromDate = (date: Date | null): string =>
  date
    ? `2000-01-01T${String(date.getHours()).padStart(2, "0")}:${String(
        date.getMinutes()
      ).padStart(2, "0")}:00`
    : "";

const timeStorageOrNull = (v: string | undefined | null): string | null =>
  v && String(v).trim() ? v : null;

const toIsoCalendarDate = (date: Date | null): string | null => {
  if (!date) return null;
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
};

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseIsoDateOnly(iso: string): Date | null {
  const t = String(iso ?? "").trim();
  if (!t) return null;
  const parts = t.split("-");
  if (parts.length !== 3) return null;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const day = Number(parts[2]);
  if (!y || !m || !day) return null;
  const d = new Date(y, m - 1, day);
  return Number.isNaN(d.getTime()) ? null : d;
}

function compareIsoDateOnlyAsc(aIso: string, bIso: string): number | null {
  const a = parseIsoDateOnly(aIso);
  const b = parseIsoDateOnly(bIso);
  if (!a || !b) return null;
  return startOfLocalDay(a).getTime() - startOfLocalDay(b).getTime();
}

function minutesFromScheduleTimeStorage(st: string): number | null {
  const t = String(st ?? "").trim();
  if (!t) return null;
  const m = t.match(/T(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
}

function isScheduleEndAfterStartSameDay(start: string, end: string): boolean {
  const a = minutesFromScheduleTimeStorage(start);
  const b = minutesFromScheduleTimeStorage(end);
  if (a == null || b == null) return false;
  return b > a;
}

const scheduleTimeAllowAll = (): boolean => true;

type QuoteEditAllDialogProps = {
  quoteMongoId: string;
  onClose: () => void;
  onSaved?: () => void;
};

const STATUS_OPTIONS: OptionType[] = [
  { value: "new", label: "New" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "failed", label: "Failed" },
];

const QuoteEditAllDialog: React.FC<QuoteEditAllDialogProps> & {
  show: (quoteMongoId: string, onSaved?: () => void) => void;
} = ({ quoteMongoId, onClose, onSaved }) => {
  const currentUserRole = String(getLocalStorage(AppConstant.userRole) ?? "");
  const isSuperAdminOrStaff =
    currentUserRole === UserRole.ADMIN ||
    currentUserRole === UserRole.STAFF;

  const [quoteRow, setQuoteRow] = useState<QuoteRow | null>(null);
  const [loadError, setLoadError] = useState("");
  const [catalogBusy, setCatalogBusy] = useState(false);

  const [quoteCategoryOptions, setQuoteCategoryOptions] = useState<
    OptionType[]
  >([]);
  const [quoteCatalogServices, setQuoteCatalogServices] = useState<
    ServiceDropDownOption[]
  >([]);
  const [quoteEmployeeOptions, setQuoteEmployeeOptions] = useState<
    OptionType[]
  >([]);
  const [catalogPartnerRecords, setCatalogPartnerRecords] = useState<
    Record<string, unknown>[]
  >([]);
  const [quotePartnerOptions, setQuotePartnerOptions] = useState<OptionType[]>(
    []
  );
  const [quoteUserOptions, setQuoteUserOptions] = useState<QuoteUserOption[]>(
    []
  );
  const [quoteCustomerRecords, setQuoteCustomerRecords] = useState<
    Record<string, unknown>[]
  >([]);
  const [franchiseQuotePinSet, setFranchiseQuotePinSet] = useState<Set<string>>(
    () => new Set()
  );
  const [franchiseQuoteAreaIdSet, setFranchiseQuoteAreaIdSet] = useState<
    Set<string>
  >(() => new Set());
  const [franchisePinsLoadDone, setFranchisePinsLoadDone] = useState(false);

  const catalogSeqRef = useRef(0);
  const initialStatusKeyRef = useRef("");
  const skipAutoPriceRef = useRef(true);
  const [apiServiceFees, setApiServiceFees] = useState<
    ServiceDropDownOption | undefined
  >(undefined);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    getValues,
    formState: { errors, isSubmitted },
  } = useForm<EditQuoteFormValues>({
    defaultValues: {
      franchise_id: "",
      user_id: "",
      user_name: "",
      requested_services: "",
      requested_partner: "",
      employee_id: "",
      category_id: "",
      requested_date: "",
      requested_date_to: "",
      requested_time: "",
      requested_time_from: "",
      requested_time_to: "",
      service_price: "",
      description: "",
      quote_status: "new",
    },
  });

  const form = watch();
  const serviceId = String(form.requested_services ?? "").trim();
  const hasServiceSelected = Boolean(serviceId);
  const partnerSelected = Boolean(String(form.requested_partner ?? "").trim());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadError("");
      const { quote: row, serviceFees } = await fetchQuoteDetailById(
        quoteMongoId
      );
      if (cancelled) return;
      if (!row) {
        setLoadError("Could not load this quote.");
        setQuoteRow(null);
        setApiServiceFees(undefined);
        return;
      }
      setQuoteRow(row);
      setApiServiceFees(serviceFees);
      initialStatusKeyRef.current = String(row.status ?? "").toLowerCase();
    })();
    return () => {
      cancelled = true;
    };
  }, [quoteMongoId]);

  const franchiseIdForCatalog = useMemo(() => {
    if (!quoteRow) return "";
    const fromRow = String(quoteRow.franchise_id ?? "").trim();
    if (fromRow) return fromRow;
    return resolveFranchiseIdForQuoteForm("");
  }, [quoteRow]);

  useEffect(() => {
    if (!franchiseIdForCatalog) {
      setQuoteCategoryOptions([]);
      setQuoteCatalogServices([]);
      setQuoteEmployeeOptions([]);
      setCatalogPartnerRecords([]);
      setQuotePartnerOptions([]);
      setQuoteUserOptions([]);
      setQuoteCustomerRecords([]);
      setFranchiseQuotePinSet(new Set());
      setFranchiseQuoteAreaIdSet(new Set());
      setFranchisePinsLoadDone(true);
      setQuoteFranchiseCatalogSnapshot(null);
      return;
    }
    const seq = (catalogSeqRef.current += 1);
    setFranchisePinsLoadDone(false);
    setCatalogBusy(true);
    void (async () => {
      const { success, record } = await fetchFranchiseRelatedCatalog(
        franchiseIdForCatalog
      );
      if (seq !== catalogSeqRef.current) return;
      if (!success || !record) {
        setQuoteCategoryOptions([]);
        setQuoteCatalogServices([]);
        setQuoteEmployeeOptions([]);
        setCatalogPartnerRecords([]);
        setQuotePartnerOptions([]);
        setQuoteUserOptions([]);
        setQuoteCustomerRecords([]);
        setFranchiseQuotePinSet(new Set());
        setFranchiseQuoteAreaIdSet(new Set());
        setFranchisePinsLoadDone(true);
        setQuoteFranchiseCatalogSnapshot(null);
        setCatalogBusy(false);
        return;
      }
      const mapped = mapRelatedCatalogToQuoteOptions(record);
      setQuoteCategoryOptions(mapped.quoteCategoryOptions);
      setQuoteCatalogServices(mapped.quoteCatalogServices);
      setQuoteEmployeeOptions(mapped.quoteEmployeeOptions);
      setQuoteUserOptions(mapped.quoteUserOptions);
      setQuoteCustomerRecords(mapped.quoteCustomerRecords);
      setCatalogPartnerRecords(mapped.quotePartnerRecords);
      setQuoteFranchiseCatalogSnapshot({
        partnerRecords: mapped.quotePartnerRecords,
        employeeRows: mapped.quoteEmployeeRecords,
      });
      const fr = record.franchise as Record<string, unknown> | undefined;
      setFranchiseQuoteAreaIdSet(new Set(collectFranchiseAreaIds(fr)));
      setFranchiseQuotePinSet(buildFranchisePincodeSetFromRelatedCatalog(record));
      setFranchisePinsLoadDone(true);
      setCatalogBusy(false);
    })();
  }, [franchiseIdForCatalog]);

  useEffect(() => {
    const opts = catalogPartnerRecords.map((p) => {
      const value = String(
        p.partner_id ?? p._id ?? p.user_id ?? p.id ?? ""
      ).trim();
      const label = String(
        p.partner_name ?? p.name ?? p.user_name ?? value
      ).trim();
      return { value, label: label || value };
    });
    setQuotePartnerOptions(opts.filter((o) => o.value));
  }, [catalogPartnerRecords]);

  useEffect(() => {
    if (!quoteRow || catalogBusy || !franchisePinsLoadDone) return;
    skipAutoPriceRef.current = true;
    reset(seedEditQuoteFormFromRow(quoteRow));
    const t = window.setTimeout(() => {
      skipAutoPriceRef.current = false;
    }, 0);
    return () => window.clearTimeout(t);
  }, [quoteRow, catalogBusy, franchisePinsLoadDone, reset]);

  const clearScheduleAndPriceFields = useCallback(() => {
    setValue("requested_date", "", { shouldValidate: false });
    setValue("requested_date_to", "", { shouldValidate: false });
    setValue("requested_time_from", "", { shouldValidate: false });
    setValue("requested_time_to", "", { shouldValidate: false });
    setValue("service_price", "", { shouldValidate: false });
  }, [setValue]);

  const applySelectFieldValue = useCallback(
    (name: keyof EditQuoteFormValues, value: unknown) => {
      setValue(name, value as EditQuoteFormValues[typeof name], {
        shouldValidate: isSubmitted,
      });
    },
    [isSubmitted, setValue]
  );

  const quoteAddressFallback = useMemo(
    () =>
      quoteRow?.address_id
        ? {
            addressId: quoteRow.address_id,
            state: quoteRow.state,
            city: quoteRow.city,
            area: quoteRow.area,
            street: quoteRow.street ?? quoteRow.address_line,
            landmark: quoteRow.landmark,
            pincode: quoteRow.pincode,
          }
        : undefined,
    [quoteRow]
  );

  const { addressUi, selectedAddressId, setSelectedAddressId } =
    useQuoteCustomerAddressPanel({
      userId: String(form.user_id ?? "").trim(),
      quoteCustomerRecords,
      franchiseQuotePinSet,
      franchiseQuoteAreaIdSet,
      franchisePinsLoadDone,
      preferredAddressId: quoteRow?.address_id,
      quoteAddressFallback,
    });

  const selectedPartnerCatalogRecord = useMemo(() => {
    const pid = String(form.requested_partner ?? "").trim();
    if (!pid) return null;
    return (
      catalogPartnerRecords.find(
        (p) =>
          String(p.partner_id ?? p._id ?? p.user_id ?? p.id ?? "").trim() ===
          pid
      ) ?? null
    );
  }, [form.requested_partner, catalogPartnerRecords]);

  const quoteCatalogServicesForPartner = useMemo(() => {
    const allow = getPartnerProvidingServiceIdSet(selectedPartnerCatalogRecord);
    if (!allow) return quoteCatalogServices;
    return quoteCatalogServices.filter((o) => allow.has(String(o.value)));
  }, [quoteCatalogServices, selectedPartnerCatalogRecord]);

  const quoteCategoryOptionsForPartner = useMemo(() => {
    const partnerCatIds = getPartnerAvailableCategoryIdSet(
      selectedPartnerCatalogRecord
    );
    const catIdsFromProviding = getPartnerCategoryIdsFromProviding(
      selectedPartnerCatalogRecord
    );
    const catIdsFromServices = new Set(
      quoteCatalogServicesForPartner
        .map((o) => normalizeServiceCategoryRef(o.category_id))
        .filter(Boolean)
    );
    catIdsFromProviding.forEach((id) => {
      catIdsFromServices.add(id);
    });
    let base =
      catIdsFromServices.size === 0
        ? quoteCategoryOptions
        : quoteCategoryOptions.filter((c) =>
            catIdsFromServices.has(String(c.value))
          );
    if (partnerCatIds && partnerCatIds.size > 0) {
      const narrowed = base.filter((c) => partnerCatIds.has(String(c.value)));
      if (narrowed.length > 0) {
        base = narrowed;
      }
    }
    return base;
  }, [
    quoteCategoryOptions,
    quoteCatalogServicesForPartner,
    selectedPartnerCatalogRecord,
  ]);

  const { quoteServiceOptionsForCategory, scheduleMode } = useMemo(() => {
    const cid = String(form.category_id ?? "").trim();
    const quoteServiceOptionsForCategory = !cid
      ? []
      : quoteCatalogServicesForPartner.filter((o) => {
          const ref = normalizeServiceCategoryRef(o.category_id);
          return ref === cid;
        });
    const sid = String(form.requested_services ?? "").trim();
    const opt = quoteServiceOptionsForCategory.find((o) => o.value === sid);
    return {
      quoteServiceOptionsForCategory,
      scheduleMode: getQuoteScheduleModeFromServiceOption({
        payment_type: opt?.payment_type,
        label: opt?.label ?? "",
      }),
    };
  }, [
    form.category_id,
    form.requested_services,
    quoteCatalogServicesForPartner,
  ]);

  const isScheduleComplete = useMemo(() => {
    if (!hasServiceSelected) return false;
    const d = String(form.requested_date ?? "").trim();
    const dTo = String(form.requested_date_to ?? "").trim();
    const tFrom = String(form.requested_time_from ?? "").trim();
    const tTo = String(form.requested_time_to ?? "").trim();
    if (scheduleMode === "range") {
      return Boolean(d && dTo && tFrom && tTo);
    }
    return Boolean(d && tFrom && tTo);
  }, [
    hasServiceSelected,
    scheduleMode,
    form.requested_date,
    form.requested_date_to,
    form.requested_time_from,
    form.requested_time_to,
  ]);

  const selectedServiceOption = useMemo(() => {
    if (!serviceId) return undefined;
    return quoteServiceOptionsForCategory.find((o) => o.value === serviceId);
  }, [serviceId, quoteServiceOptionsForCategory]);

  const feeOptionForPreview = useMemo(() => {
    const merged = mergeQuoteServiceFeesForBreakdown(
      selectedServiceOption,
      selectedPartnerCatalogRecord,
      serviceId
    );
    return merged ?? apiServiceFees;
  }, [selectedServiceOption, selectedPartnerCatalogRecord, serviceId, apiServiceFees]);

  const scheduleTimeIntervals = useMemo(() => {
    const pay = String(feeOptionForPreview?.payment_type ?? "").toLowerCase();
    if (pay.includes("hour")) return 60;
    return 30;
  }, [feeOptionForPreview?.payment_type]);

  const editPriceBreakdown = useMemo(
    () => computeQuotePriceBreakdown(form.service_price, feeOptionForPreview),
    [form.service_price, feeOptionForPreview]
  );

  const schedulePricePreview = useMemo(() => {
    if (!isScheduleComplete || !partnerSelected) return null;
    const metrics = deriveQuoteScheduleMetrics({
      scheduleMode,
      requested_date: String(form.requested_date ?? ""),
      requested_date_to: String(form.requested_date_to ?? ""),
      requested_time: String(form.requested_time ?? ""),
      requested_time_from: String(form.requested_time_from ?? ""),
      requested_time_to: String(form.requested_time_to ?? ""),
    });
    if (!metrics) return null;
    const row = getPartnerActiveServiceProvidingRow(
      selectedPartnerCatalogRecord,
      serviceId
    );
    return buildQuoteSchedulePricePreview(
      row,
      metrics,
      AppConstant.currencySymbol
    );
  }, [
    isScheduleComplete,
    partnerSelected,
    scheduleMode,
    form.requested_date,
    form.requested_date_to,
    form.requested_time,
    form.requested_time_from,
    form.requested_time_to,
    selectedPartnerCatalogRecord,
    serviceId,
  ]);

  useEffect(() => {
    const from = String(form.requested_time_from ?? "").trim();
    const to = String(form.requested_time_to ?? "").trim();
    if (!from || !to) return;
    if (!isScheduleEndAfterStartSameDay(from, to)) {
      setValue("requested_time_to", "", { shouldValidate: false });
    }
  }, [form.requested_time_from, form.requested_time_to, setValue]);

  const endTimeFilter = useCallback(
    (time: Date) => {
      const startStr = String(form.requested_time_from ?? "").trim();
      if (!startStr) return true;
      const startM = minutesFromScheduleTimeStorage(startStr);
      if (startM == null) return true;
      const cand = time.getHours() * 60 + time.getMinutes();
      return cand > startM;
    },
    [form.requested_time_from]
  );

  /** Edit: allow any calendar date (existing quotes may be in the past). Create keeps today+. */
  const scheduleDateAllowAll = useCallback(() => true, []);

  useEffect(() => {
    if (skipAutoPriceRef.current) return;
    if (!isScheduleComplete || !partnerSelected) return;
    const sid = serviceId;
    if (!sid) return;
    const row = getPartnerActiveServiceProvidingRow(
      selectedPartnerCatalogRecord,
      sid
    );
    const metrics = deriveQuoteScheduleMetrics({
      scheduleMode,
      requested_date: String(form.requested_date ?? ""),
      requested_date_to: String(form.requested_date_to ?? ""),
      requested_time: String(form.requested_time ?? ""),
      requested_time_from: String(form.requested_time_from ?? ""),
      requested_time_to: String(form.requested_time_to ?? ""),
    });
    if (!metrics) return;
    const n = row ? computeAutoQuotePriceFromPartner(row, metrics) : 0;
    setValue("service_price", String(n), { shouldValidate: false });
  }, [
    isScheduleComplete,
    partnerSelected,
    serviceId,
    scheduleMode,
    form.requested_date,
    form.requested_date_to,
    form.requested_time,
    form.requested_time_from,
    form.requested_time_to,
    selectedPartnerCatalogRecord,
    setValue,
  ]);

  const scheduleToDateFilter = useCallback(
    (date: Date) => {
      const fromIso = String(form.requested_date ?? "").trim();
      if (!fromIso) return true;
      const from = parseIsoDateOnly(fromIso);
      if (!from) return true;
      return startOfLocalDay(date) >= startOfLocalDay(from);
    },
    [form.requested_date]
  );

  const userSelectOptions = useMemo<OptionType[]>(
    () => quoteUserOptions.map((u) => ({ value: u.value, label: u.label })),
    [quoteUserOptions]
  );

  const onSubmit = async (data: EditQuoteFormValues) => {
    const id = String(quoteMongoId ?? "").trim();
    if (!id) {
      showErrorAlert("Missing quote id.");
      return;
    }

    const price = Number.parseFloat(String(data.service_price).trim());
    if (Number.isNaN(price) || price < 0) {
      showErrorAlert("Enter a valid service price.");
      return;
    }

    if (String(data.user_id ?? "").trim() && !addressUi.ready) {
      showErrorAlert(
        "Still loading address options for this franchise. Please wait a moment."
      );
      return;
    }
    if (addressUi.error) {
      showErrorAlert(addressUi.error);
      return;
    }
    if (!selectedAddressId.trim()) {
      if (!addressUi.rows.length) {
        showErrorAlert(
          "No saved address on file for this customer. Add an address to the user profile before updating."
        );
      } else {
        showErrorAlert(
          "Select a customer address for this quote. Addresses outside this franchise's service area cannot be used."
        );
      }
      return;
    }

    if (!String(data.requested_partner ?? "").trim()) {
      showErrorAlert("Please select a partner.");
      return;
    }
    if (!String(data.category_id ?? "").trim()) {
      showErrorAlert("Please select a category.");
      return;
    }
    if (!String(data.requested_services ?? "").trim()) {
      showErrorAlert("Please select a service.");
      return;
    }

    if (scheduleMode === "range") {
      if (!String(data.requested_date ?? "").trim()) {
        showErrorAlert("Please select from date.");
        return;
      }
      if (!String(data.requested_date_to ?? "").trim()) {
        showErrorAlert("Please select to date.");
        return;
      }
    } else {
      if (!String(data.requested_date ?? "").trim()) {
        showErrorAlert("Please select a date.");
        return;
      }
    }
    if (
      !String(data.requested_time_from ?? "").trim() ||
      !String(data.requested_time_to ?? "").trim()
    ) {
      showErrorAlert("Please select start and end time.");
      return;
    }

    if (scheduleMode === "range") {
      const cmp = compareIsoDateOnlyAsc(
        String(data.requested_date ?? "").trim(),
        String(data.requested_date_to ?? "").trim()
      );
      if (cmp != null && cmp > 0) {
        showErrorAlert("End date must be on or after the start date.");
        return;
      }
    }
    if (
      !isScheduleEndAfterStartSameDay(
        String(data.requested_time_from ?? "").trim(),
        String(data.requested_time_to ?? "").trim()
      )
    ) {
      showErrorAlert(
        "End time must be after start time on the same day (use a later time, not earlier in the morning than the start)."
      );
      return;
    }

    const metrics = deriveQuoteScheduleMetrics({
      scheduleMode,
      requested_date: data.requested_date,
      requested_date_to: data.requested_date_to,
      requested_time: data.requested_time,
      requested_time_from: data.requested_time_from,
      requested_time_to: data.requested_time_to,
    });
    if (!metrics) {
      showErrorAlert("Invalid schedule.");
      return;
    }

    const patch: Record<string, unknown> = {
      category_id: String(data.category_id ?? "").trim(),
      service_id: String(data.requested_services ?? "").trim(),
      partner_id: String(data.requested_partner ?? "").trim() || undefined,
      employee_id: String(data.employee_id ?? "").trim() || undefined,
      address_id: selectedAddressId.trim(),
      service_price: price,
      from_date: metrics.from_date,
      to_date: metrics.to_date,
      work_start_time: metrics.work_start_time,
      work_end_time: metrics.work_end_time,
      work_hours_per_day: metrics.work_hours_per_day,
      total_work_hours: metrics.total_work_hours,
      quote_description: String(data.description ?? "").trim() || undefined,
    };

    let ok = await updateQuote(id, patch);
    if (!ok) {
      showErrorAlert("Could not update quote.");
      return;
    }

    const nextStatus = String(data.quote_status ?? "").trim().toLowerCase();
    const prev = initialStatusKeyRef.current;
    if (nextStatus && nextStatus !== prev) {
      ok = await applyQuoteHeaderPatch(id, { status: nextStatus });
      if (!ok) {
        showErrorAlert("Quote was updated, but status could not be changed.");
        onSaved?.();
        onClose();
        return;
      }
    }

    showSuccessAlert("Quote updated.");
    onSaved?.();
    onClose();
  };

  const renderAddressCards = (rows: QuoteAddressRowUi[]) =>
    rows.map((row) => {
      const selected = selectedAddressId === row.id && row.selectable;
      const areaMode = franchiseQuoteAreaIdSet.size > 0;
      const addressFallback =
        !row.stateName &&
        !row.cityName &&
        !row.areaName &&
        !row.streetAddress
          ? row.summary
          : "";
      const pairCandidates: [string, string][] = [
        ["State", row.stateName],
        ["City", row.cityName],
        ["Area", row.areaName],
        ["Address", row.streetAddress || addressFallback],
        ["Landmark", row.landmark],
        ["Pin code", row.pincode],
      ];
      const pairs = pairCandidates.filter((p): p is [string, string] =>
        Boolean(String(p[1] ?? "").trim())
      );

      return (
        <div
          key={row.id}
          className={`add-quote-address-card-wrap p-2 ${
            !row.selectable ? "add-quote-address-card-wrap--muted" : ""
          }`}
          style={{
            border: selected
              ? "2px solid var(--primary-color)"
              : `1px solid ${
                  row.selectable
                    ? "rgba(0, 0, 0, 0.1)"
                    : "rgba(0, 0, 0, 0.08)"
                }`,
            backgroundColor: row.selectable
              ? "var(--bg-color)"
              : "rgba(0, 0, 0, 0.02)",
            boxShadow: selected
              ? "0 10px 28px rgba(0, 0, 0, 0.09)"
              : "0 2px 12px rgba(0, 0, 0, 0.05)",
            transform: selected ? "translateY(-2px)" : undefined,
          }}
        >
          <Form.Check
            type="radio"
            name="edit-quote-address"
            id={`edit-quote-addr-${row.id}`}
            disabled={!row.selectable}
            checked={selectedAddressId === row.id && row.selectable}
            onChange={() => {
              if (row.selectable) setSelectedAddressId(row.id);
            }}
            className="add-quote-address-card-check"
            style={{
              cursor: row.selectable ? "pointer" : "not-allowed",
            }}
            label={
              <div className="add-quote-address-card-inner">
                <div className="add-quote-address-card-header">
                  <span className="add-quote-address-card-name">
                    {row.contactName}
                  </span>
                  <span
                    className={`add-quote-address-card-badge ${
                      row.selectable
                        ? "add-quote-address-card-badge--ok"
                        : "add-quote-address-card-badge--no"
                    }`}
                  >
                    {row.selectable ? "Available" : "Unavailable"}
                  </span>
                </div>
                <div className="add-quote-address-card-grid">
                  {pairs.map(([label, value]) => (
                    <React.Fragment key={`${row.id}-${label}`}>
                      <span className="add-quote-address-card-grid-label">
                        {label}
                      </span>
                      <span className="add-quote-address-card-grid-value">
                        {value}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
                {!row.selectable ? (
                  <div className="add-quote-address-card-footnote">
                    {areaMode
                      ? "Outside this franchise’s service areas."
                      : "Postcode not in this franchise’s service list."}
                  </div>
                ) : null}
              </div>
            }
          />
        </div>
      );
    });

  const lockedFields = catalogBusy || !quoteRow;

  return (
    <Modal
      show
      onHide={onClose}
      {...QUOTE_MODAL_LAYOUT}
      enforceFocus={false}
    >
      <Modal.Header className="py-3 px-4 border-bottom-0">
        <Modal.Title as="h5" className="custom-modal-title">
          Edit quote
        </Modal.Title>
        <CustomCloseButton onClose={onClose} />
      </Modal.Header>
      <Modal.Body className="add-quote-modal-body pt-0">
        {loadError ? (
          <div className="text-danger py-3">{loadError}</div>
        ) : !quoteRow ? (
          <div className="text-muted py-3">Loading quote…</div>
        ) : (
          <form
            id="quote-edit-all-form"
            noValidate
            onSubmit={handleSubmit(onSubmit)}
          >
            <section className="custom-other-details add-quote-form-section">
              <Row className="gy-3 gx-md-4 align-items-start">
                <Col xs={12} md={6}>
                  <CustomTextFieldSelect
                    label="User"
                    controlId="edit-quote-user"
                    asCol={false}
                    options={userSelectOptions}
                    register={register as unknown as UseFormRegister<AddQuoteFormValues>}
                    fieldName="user_id"
                    error={errors.user_id}
                    requiredMessage="Please select a user"
                    defaultValue={form.user_id}
                    setValue={setValue as (name: string, value: unknown) => void}
                    placeholder="Search user"
                    menuPortal
                    isClearable={false}
                    isDisabled
                  />
                </Col>
                {!isSuperAdminOrStaff ? (
                  <Col xs={12} md={6}>
                    <CustomTextFieldSelect
                      label="Employee"
                      controlId="edit-quote-employee-super"
                      asCol={false}
                      options={quoteEmployeeOptions}
                      register={register as unknown as UseFormRegister<AddQuoteFormValues>}
                      fieldName="employee_id"
                      error={errors.employee_id}
                      defaultValue={form.employee_id}
                      setValue={setValue as (name: string, value: unknown) => void}
                      placeholder="Select employee"
                      menuPortal
                      isClearable
                      isDisabled={lockedFields}
                    />
                  </Col>
                ) : null}
              </Row>

              {String(form.user_id ?? "").trim() ? (
                <Row className="mt-4">
                  <Col xs={12}>
                    <label
                      className="custom-profile-lable d-block"
                      style={{ fontWeight: 600, marginBottom: "1.125rem" }}
                    >
                      Customer addresses
                    </label>
                    {!addressUi.ready ? (
                      <div className="small text-muted">
                        Loading address options…
                      </div>
                    ) : addressUi.error ? (
                      <div className="small text-danger">{addressUi.error}</div>
                    ) : addressUi.rows.length ? (
                      <div className="add-quote-address-cards-grid mb-4">
                        {renderAddressCards(addressUi.rows)}
                      </div>
                    ) : (
                      <div className="small text-warning">
                        No saved address on file for this customer.
                      </div>
                    )}
                  </Col>
                </Row>
              ) : null}

              {isSuperAdminOrStaff ? (
                <>
                  <Row className="gy-4 gx-md-5 align-items-start mt-2">
                    <Col xs={12} md={6}>
                      <CustomTextFieldSelect
                        label="Employee"
                        controlId="edit-quote-employee"
                        asCol={false}
                        options={quoteEmployeeOptions}
                        register={register as unknown as UseFormRegister<AddQuoteFormValues>}
                        fieldName="employee_id"
                        error={errors.employee_id}
                        defaultValue={form.employee_id}
                        setValue={setValue as (name: string, value: unknown) => void}
                        placeholder="Select employee"
                        menuPortal
                        isClearable
                        isDisabled={lockedFields}
                      />
                    </Col>
                    <Col xs={12} md={6}>
                      <CustomTextFieldSelect
                        label="Partner"
                        controlId="edit-quote-partner"
                        asCol={false}
                        options={quotePartnerOptions}
                        register={register as unknown as UseFormRegister<AddQuoteFormValues>}
                        fieldName="requested_partner"
                        error={errors.requested_partner}
                        requiredMessage="Please select a partner"
                        defaultValue={form.requested_partner}
                        setValue={(name, value) => {
                          if (name === "requested_partner") {
                            const prev = getValues("requested_partner");
                            applySelectFieldValue("requested_partner", value);
                            if (String(value ?? "") !== String(prev ?? "")) {
                              setValue("category_id", "", { shouldValidate: false });
                              setValue("requested_services", "", {
                                shouldValidate: false,
                              });
                              clearScheduleAndPriceFields();
                            }
                            return;
                          }
                          applySelectFieldValue(
                            name as keyof EditQuoteFormValues,
                            value
                          );
                        }}
                        placeholder="Select partner"
                        menuPortal
                        isClearable
                        isDisabled={lockedFields}
                      />
                    </Col>
                  </Row>
                  <Row className="gy-4 gx-md-5 align-items-start">
                    <Col xs={12} md={6}>
                      <CustomTextFieldSelect
                        label="Category"
                        controlId="edit-quote-category"
                        asCol={false}
                        options={quoteCategoryOptionsForPartner}
                        register={register as unknown as UseFormRegister<AddQuoteFormValues>}
                        fieldName="category_id"
                        error={errors.category_id}
                        requiredMessage="Please select a category"
                        defaultValue={form.category_id}
                        isClearable
                        setValue={(name, value) => {
                          if (name === "category_id") {
                            const prev = getValues("category_id");
                            applySelectFieldValue("category_id", value);
                            if (String(value ?? "") !== String(prev ?? "")) {
                              setValue("requested_services", "", {
                                shouldValidate: false,
                              });
                              clearScheduleAndPriceFields();
                            }
                            return;
                          }
                          applySelectFieldValue(
                            name as keyof EditQuoteFormValues,
                            value
                          );
                        }}
                        placeholder={
                          partnerSelected ? "Select category" : "Select partner first"
                        }
                        menuPortal
                        isDisabled={lockedFields || !partnerSelected}
                      />
                    </Col>
                    <Col xs={12} md={6}>
                      <CustomTextFieldSelect
                        key={`edit-quote-svc-${form.category_id || "none"}`}
                        label="Service"
                        controlId="edit-quote-service"
                        asCol={false}
                        options={quoteServiceOptionsForCategory}
                        register={register as unknown as UseFormRegister<AddQuoteFormValues>}
                        fieldName="requested_services"
                        error={errors.requested_services}
                        requiredMessage={
                          form.category_id && partnerSelected
                            ? "Please select a service"
                            : undefined
                        }
                        defaultValue={form.requested_services}
                        setValue={(name, value) => {
                          if (name === "requested_services") {
                            const prev = getValues("requested_services");
                            applySelectFieldValue("requested_services", value);
                            if (String(value ?? "") !== String(prev ?? "")) {
                              clearScheduleAndPriceFields();
                            }
                            return;
                          }
                          applySelectFieldValue(
                            name as keyof EditQuoteFormValues,
                            value
                          );
                        }}
                        placeholder={
                          !partnerSelected
                            ? "Select partner first"
                            : !form.category_id
                            ? "Select category first"
                            : "Select service"
                        }
                        menuPortal
                        isClearable
                        isDisabled={
                          lockedFields ||
                          !partnerSelected ||
                          !String(form.category_id ?? "").trim()
                        }
                      />
                    </Col>
                  </Row>
                </>
              ) : (
                <Row className="gy-4 gx-md-5 align-items-start mt-2">
                  <Col xs={12} md={6}>
                    <CustomTextFieldSelect
                      label="Partner"
                      controlId="edit-quote-partner"
                      asCol={false}
                      options={quotePartnerOptions}
                      register={register as unknown as UseFormRegister<AddQuoteFormValues>}
                      fieldName="requested_partner"
                      error={errors.requested_partner}
                      requiredMessage="Please select a partner"
                      defaultValue={form.requested_partner}
                      setValue={(name, value) => {
                        if (name === "requested_partner") {
                          const prev = getValues("requested_partner");
                          applySelectFieldValue("requested_partner", value);
                          if (String(value ?? "") !== String(prev ?? "")) {
                            setValue("category_id", "", { shouldValidate: false });
                            setValue("requested_services", "", {
                              shouldValidate: false,
                            });
                            clearScheduleAndPriceFields();
                          }
                          return;
                        }
                        applySelectFieldValue(
                          name as keyof EditQuoteFormValues,
                          value
                        );
                      }}
                      placeholder="Select partner"
                      menuPortal
                      isClearable
                      isDisabled={lockedFields}
                    />
                  </Col>
                  <Col xs={12} md={6}>
                    <CustomTextFieldSelect
                      label="Category"
                      controlId="edit-quote-category"
                      asCol={false}
                      options={quoteCategoryOptionsForPartner}
                      register={register as unknown as UseFormRegister<AddQuoteFormValues>}
                      fieldName="category_id"
                      error={errors.category_id}
                      requiredMessage="Please select a category"
                      defaultValue={form.category_id}
                      isClearable
                      setValue={(name, value) => {
                        if (name === "category_id") {
                          const prev = getValues("category_id");
                          applySelectFieldValue("category_id", value);
                          if (String(value ?? "") !== String(prev ?? "")) {
                            setValue("requested_services", "", {
                              shouldValidate: false,
                            });
                            clearScheduleAndPriceFields();
                          }
                          return;
                        }
                        applySelectFieldValue(
                          name as keyof EditQuoteFormValues,
                          value
                        );
                      }}
                      placeholder={
                        partnerSelected ? "Select category" : "Select partner first"
                      }
                      menuPortal
                      isDisabled={lockedFields || !partnerSelected}
                    />
                  </Col>
                  <Col xs={12} md={6}>
                    <CustomTextFieldSelect
                      key={`edit-quote-svc-${form.category_id || "none"}`}
                      label="Service"
                      controlId="edit-quote-service"
                      asCol={false}
                      options={quoteServiceOptionsForCategory}
                      register={register as unknown as UseFormRegister<AddQuoteFormValues>}
                      fieldName="requested_services"
                      error={errors.requested_services}
                      requiredMessage={
                        form.category_id && partnerSelected
                          ? "Please select a service"
                          : undefined
                      }
                      defaultValue={form.requested_services}
                      setValue={(name, value) => {
                        if (name === "requested_services") {
                          const prev = getValues("requested_services");
                          applySelectFieldValue("requested_services", value);
                          if (String(value ?? "") !== String(prev ?? "")) {
                            clearScheduleAndPriceFields();
                          }
                          return;
                        }
                        applySelectFieldValue(
                          name as keyof EditQuoteFormValues,
                          value
                        );
                      }}
                      placeholder={
                        !partnerSelected
                          ? "Select partner first"
                          : !form.category_id
                          ? "Select category first"
                          : "Select service"
                      }
                      menuPortal
                      isClearable
                      isDisabled={
                        lockedFields ||
                        !partnerSelected ||
                        !String(form.category_id ?? "").trim()
                      }
                    />
                  </Col>
                </Row>
              )}

              {hasServiceSelected ? (
                <>
                  <Row className="mt-4 mb-2">
                    <Col xs={12}>
                      <label
                        style={{
                          fontSize: "17px",
                          fontWeight: "600",
                          color: "var(--primary-color)",
                        }}
                        className="d-block mb-0"
                      >
                        Schedule
                      </label>
                    </Col>
                  </Row>
                  <div className="add-quote-schedule-panel">
                    <Row className="gy-4 gx-md-5">
                      {scheduleMode === "range" ? (
                        <>
                          <Col xs={12} md={3}>
                            <CustomTextFieldDatePicket
                              label="From date"
                              controlId="edit_requested_date"
                              selectedDate={form.requested_date || null}
                              onChange={(date) => {
                                const next = toIsoCalendarDate(date) ?? "";
                                setValue("requested_date", next, {
                                  shouldValidate: true,
                                });
                              }}
                              register={register as unknown as UseFormRegister<AddQuoteFormValues>}
                              setValue={setValue as (n: string, v: unknown) => void}
                              asCol={false}
                              labelSize={12}
                              placeholderText="From date"
                              filterDate={scheduleDateAllowAll}
                            />
                          </Col>
                          <Col xs={12} md={3}>
                            <CustomTextFieldDatePicket
                              label="To date"
                              controlId="edit_requested_date_to"
                              selectedDate={form.requested_date_to || null}
                              onChange={(date) => {
                                const next = toIsoCalendarDate(date) ?? "";
                                setValue("requested_date_to", next, {
                                  shouldValidate: true,
                                });
                              }}
                              register={register as unknown as UseFormRegister<AddQuoteFormValues>}
                              setValue={setValue as (n: string, v: unknown) => void}
                              asCol={false}
                              labelSize={12}
                              placeholderText="To date"
                              filterDate={scheduleToDateFilter}
                            />
                          </Col>
                          <Col xs={12} md={3}>
                            <CustomTextFieldTimePicket
                              label="Start time"
                              controlId="edit_requested_time_from"
                              selectedTime={timeStorageOrNull(form.requested_time_from)}
                              onChange={(date) =>
                                setValue(
                                  "requested_time_from",
                                  toTimeStorageFromDate(date),
                                  { shouldValidate: true }
                                )
                              }
                              placeholderText="Select start time"
                              error={errors.requested_time_from}
                              register={register}
                              validation={{ required: "Start time is required" }}
                              setValue={setValue}
                              asCol={false}
                              labelSize={12}
                              timeIntervals={scheduleTimeIntervals}
                              filterTime={scheduleTimeAllowAll}
                            />
                          </Col>
                          <Col xs={12} md={3}>
                            <CustomTextFieldTimePicket
                              label="End time"
                              controlId="edit_requested_time_to"
                              selectedTime={timeStorageOrNull(form.requested_time_to)}
                              onChange={(date) =>
                                setValue(
                                  "requested_time_to",
                                  toTimeStorageFromDate(date),
                                  { shouldValidate: true }
                                )
                              }
                              placeholderText="After start time"
                              error={errors.requested_time_to}
                              register={register}
                              validation={{ required: "End time is required" }}
                              setValue={setValue}
                              asCol={false}
                              labelSize={12}
                              timeIntervals={scheduleTimeIntervals}
                              filterTime={endTimeFilter}
                            />
                          </Col>
                        </>
                      ) : (
                        <>
                          <Col xs={12} md={4}>
                            <CustomTextFieldDatePicket
                              label="Date"
                              controlId="edit_requested_date"
                              selectedDate={form.requested_date || null}
                              onChange={(date) => {
                                const next = toIsoCalendarDate(date) ?? "";
                                setValue("requested_date", next, {
                                  shouldValidate: true,
                                });
                              }}
                              register={register as unknown as UseFormRegister<AddQuoteFormValues>}
                              setValue={setValue as (n: string, v: unknown) => void}
                              asCol={false}
                              labelSize={12}
                              placeholderText="Select date"
                              filterDate={scheduleDateAllowAll}
                            />
                          </Col>
                          <Col xs={12} md={4}>
                            <CustomTextFieldTimePicket
                              label="Start time"
                              controlId="edit_requested_time_from"
                              selectedTime={timeStorageOrNull(form.requested_time_from)}
                              onChange={(date) =>
                                setValue(
                                  "requested_time_from",
                                  toTimeStorageFromDate(date),
                                  { shouldValidate: true }
                                )
                              }
                              placeholderText="Select start time"
                              error={errors.requested_time_from}
                              register={register}
                              validation={{ required: "Start time is required" }}
                              setValue={setValue}
                              asCol={false}
                              labelSize={12}
                              timeIntervals={scheduleTimeIntervals}
                              filterTime={scheduleTimeAllowAll}
                            />
                          </Col>
                          <Col xs={12} md={4}>
                            <CustomTextFieldTimePicket
                              label="End time"
                              controlId="edit_requested_time_to"
                              selectedTime={timeStorageOrNull(form.requested_time_to)}
                              onChange={(date) =>
                                setValue(
                                  "requested_time_to",
                                  toTimeStorageFromDate(date),
                                  { shouldValidate: true }
                                )
                              }
                              placeholderText="After start time"
                              error={errors.requested_time_to}
                              register={register}
                              validation={{ required: "End time is required" }}
                              setValue={setValue}
                              asCol={false}
                              labelSize={12}
                              timeIntervals={scheduleTimeIntervals}
                              filterTime={endTimeFilter}
                            />
                          </Col>
                        </>
                      )}
                    </Row>
                    {schedulePricePreview ? (
                      <div className="add-quote-schedule-preview">
                        <span className="add-quote-schedule-preview-badge">
                          {schedulePricePreview.billingLabel}
                        </span>
                        <div className="add-quote-schedule-preview-line">
                          {schedulePricePreview.primaryLine}
                        </div>
                        {schedulePricePreview.secondaryLine ? (
                          <div className="add-quote-schedule-preview-sub">
                            {schedulePricePreview.secondaryLine}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </>
              ) : null}

              {hasServiceSelected ? (
                <div className="add-quote-price-section mt-4 pt-3 border-top">
                  <h6 className="add-quote-price-section-heading mb-3">
                    Service price
                  </h6>
                  <Row className="gy-3 gx-md-4 align-items-start">
                    <Col xs={12} md={6}>
                      <Form.Group controlId="service_price" className="mb-0">
                        <Form.Label className="fw-medium mb-1">
                          Service Price
                        </Form.Label>
                        <InputGroup>
                          <InputGroup.Text
                            className="custom-form-input text-muted"
                            style={{
                              ...partnerCatalogControlStyle,
                              borderTopRightRadius: 0,
                              borderBottomRightRadius: 0,
                              fontWeight: 600,
                            }}
                          >
                            {AppConstant.currencySymbol}
                          </InputGroup.Text>
                          <Form.Control
                            type="text"
                            inputMode="decimal"
                            disabled={lockedFields}
                            className={`custom-form-input border-start-0${
                              errors.service_price ? " is-invalid" : ""
                            }`}
                            style={{
                              ...partnerCatalogControlStyle,
                              borderLeft: 0,
                              borderTopLeftRadius: 0,
                              borderBottomLeftRadius: 0,
                            }}
                            placeholder="e.g. 1200"
                            {...register("service_price", {
                              required: "Service price is required",
                            })}
                          />
                        </InputGroup>
                        {errors.service_price?.message ? (
                          <div className="text-danger small mt-1">
                            {String(errors.service_price.message)}
                          </div>
                        ) : null}
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group controlId="edit-quote-status" className="mb-0">
                        <Form.Label
                          htmlFor="edit-quote-status"
                          className="fw-medium mb-1"
                        >
                          Quote status
                        </Form.Label>
                        <Form.Select
                          id="edit-quote-status"
                          className="form-select custom-form-input"
                          style={{
                            borderRadius: "8px",
                            borderColor: "var(--primary-color)",
                            height: "35px",
                            fontSize: "14px",
                          }}
                          disabled={lockedFields}
                          {...register("quote_status")}
                        >
                          {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                </div>
              ) : null}

              <Row className="mt-3 g-3">
                <Col xs={12}>
                  <Form.Group controlId="description" className="mb-0">
                    <Form.Label className="fw-medium mb-1">
                      Quote description
                    </Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      maxLength={2000}
                      disabled={lockedFields}
                      className={`custom-form-input${
                        errors.description ? " is-invalid" : ""
                      }`}
                      style={{
                        ...partnerCatalogControlStyle,
                        minHeight: "96px",
                        resize: "vertical",
                      }}
                      placeholder="Optional notes for this quote"
                      {...register("description")}
                    />
                    {errors.description?.message ? (
                      <div className="text-danger small mt-1">
                        {String(errors.description.message)}
                      </div>
                    ) : null}
                  </Form.Group>
                </Col>
              </Row>

              {editPriceBreakdown && hasServiceSelected ? (
                <div className="add-quote-breakdown-end mt-3">
                  <QuotePriceBreakdownPanel breakdown={editPriceBreakdown} />
                </div>
              ) : null}
            </section>
          </form>
        )}
      </Modal.Body>
      {!loadError && quoteRow ? (
        <Modal.Footer className="add-quote-modal-footer border-top-0 justify-content-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="quote-edit-all-form"
            className="custom-btn-primary"
            disabled={lockedFields}
          >
            Update
          </Button>
        </Modal.Footer>
      ) : null}
    </Modal>
  );
};

QuoteEditAllDialog.show = (quoteMongoId: string, onSaved?: () => void) => {
  openDialog("quote-edit-all-modal", (close) => (
    <QuoteEditAllDialog
      quoteMongoId={quoteMongoId}
      onClose={close}
      onSaved={onSaved}
    />
  ));
};

export default QuoteEditAllDialog;
