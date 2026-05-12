import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button, Col, Form, Modal, Row } from "react-bootstrap";
import CustomHeader from "../../components/CustomHeader";
import CustomSummaryBox from "../../components/CustomSummaryBox";
import CustomUtilityBox from "../../components/CustomUtilityBox";
import CustomTable from "../../components/CustomTable";
import CustomCloseButton from "../../components/CustomCloseButton";
import CustomActionColumn from "../../components/CustomActionColumn";
import CustomDatePicker from "../../components/CustomDatePicker";
import CustomTextField from "../../components/CustomTextField";
import CustomTextFieldDatePicket from "../../components/CustomTextFieldDatePicket";
import CustomTextFieldSelect from "../../components/CustomTextFieldSelect";
import CustomTextFieldTimePicket from "../../components/CustomTextFieldTimePicket";
import { useForm, UseFormRegister } from "react-hook-form";
import type { QuoteViewData } from "./quoteViewTypes";
import type { AddQuoteFormValues, QuoteRow, QuoteTabKey } from "./quoteTypes";
import { showErrorAlert, showSuccessAlert } from "../../helper/alertHelper";
import { openConfirmDialog } from "../../components/CustomConfirmDialog";
import {
  buildCreateQuotePayload,
  createQuote,
  deleteQuote,
  fetchFranchiseRelatedCatalog,
  fetchQuotes,
  filterCatalogPartnerRecordsByService,
  getQuoteScheduleModeFromServiceOption,
  mapRelatedCatalogToQuoteOptions,
  normalizeQuoteListSort,
  resolveFranchiseIdForQuoteForm,
  QuoteListSort,
} from "../../services/quoteService";
import type { OptionType, QuoteUserOption } from "../../services/quoteService";
import type { ServiceDropDownOption } from "../../services/servicesService";
import { normalizeServiceCategoryRef } from "../../services/servicesService";
import { fetchUserById } from "../../services/userService";
import { getLocalStorage } from "../../helper/localStorageHelper";
import { AppConstant, UserRole } from "../../constant/AppConstant";
import { fetchFranchiseDropDown } from "../../services/franchiseService";
import { getCount } from "../../services/getCountService";
import { formatQuoteScheduleForTable } from "./quoteScheduleDisplay";
import { setQuoteFranchiseCatalogSnapshot } from "./quoteFranchiseCatalogStore";

/** Time-only value for `CustomTimePicker` / stored fields (same pattern as quote schedule edit). */
const toTimeStorageFromDate = (date: Date | null): string =>
  date
    ? `2000-01-01T${String(date.getHours()).padStart(2, "0")}:${String(
        date.getMinutes()
      ).padStart(2, "0")}:00`
    : "";

const timeStorageOrNull = (v: string | undefined | null): string | null =>
  v && String(v).trim() ? v : null;

const strTrim = (v: unknown): string => {
  if (v == null) return "";
  const s = String(v).trim();
  return s === "undefined" || s === "null" ? "" : s;
};

function formatAddressLineFromRecord(rec: Record<string, unknown>): string {
  const parts = [
    strTrim(rec.door_no),
    strTrim(rec.street ?? rec.address_line ?? rec.address),
    strTrim(rec.area_name ?? rec.area),
    strTrim(rec.city_name ?? rec.city),
    strTrim(rec.landmark),
    strTrim(rec.pincode),
  ].filter(Boolean);
  return parts.join(", ");
}

/** Pick saved address id + readable line for Add Quote (matches create payload `address_id`). */
function resolveAddressIdAndSummaryFromUser(u: Record<string, unknown>): {
  addressId: string;
  summary: string;
} {
  const addrs = (u.addresses ?? u.user_addresses) as unknown[] | undefined;
  if (Array.isArray(addrs) && addrs.length) {
    const first = addrs[0] as Record<string, unknown>;
    const aid = strTrim(first._id);
    const summary = formatAddressLineFromRecord(first);
    return { addressId: aid, summary };
  }
  const aid = strTrim(
    u.primary_address_id ?? u.default_address_id ?? u.address_id
  );
  const summary = [
    strTrim(u.address),
    strTrim(u.area_name),
    strTrim(u.city_name),
    strTrim(u.pincode),
  ]
    .filter(Boolean)
    .join(", ");
  return { addressId: aid, summary };
}

const quoteTabs: { key: QuoteTabKey; label: string }[] = [
  { key: "new", label: "New" },
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "success", label: "Success" },
  { key: "failed", label: "Failed" },
];

const toIsoCalendarDate = (date: Date | null): string | null => {
  if (!date) return null;
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/**
 * Maps `getCount` `record` for `type: "quote-management"` into tab totals.
 * Accepts common key variants (snake_case / prefixes) so staging can evolve without UI churn.
 */
function mapGetCountRecordToQuoteTabCounts(
  record: Record<string, unknown> | null | undefined
): Partial<Record<QuoteTabKey, number>> | null {
  if (!record || typeof record !== "object") return null;
  const byLower = new Map(
    Object.entries(record).map(([k, v]) => [k.toLowerCase(), v])
  );
  const pick = (...aliases: string[]): number | null => {
    for (const a of aliases) {
      const v = byLower.get(a.toLowerCase());
      if (v !== undefined && v !== null) {
        const n = Number(v);
        if (Number.isFinite(n)) return n;
      }
    }
    return null;
  };
  const out: Partial<Record<QuoteTabKey, number>> = {};
  const assign = (key: QuoteTabKey, ...aliases: string[]) => {
    const n = pick(...aliases);
    if (n !== null) out[key] = n;
  };
  assign("new", "quote_new", "new_quote", "new", "total_new", "quotes_new");
  assign(
    "pending",
    "quote_pending",
    "pending_quote",
    "pending",
    "total_pending",
    "quotes_pending"
  );
  assign(
    "accepted",
    "quote_accepted",
    "accepted_quote",
    "accepted",
    "total_accepted",
    "quotes_accepted"
  );
  assign(
    "success",
    "quote_success",
    "success_quote",
    "success",
    "total_success",
    "quotes_success"
  );
  assign(
    "failed",
    "quote_failed",
    "failed_quote",
    "failed",
    "total_failed",
    "quotes_failed"
  );
  if (Object.keys(out).length === 0) return null;
  for (const { key } of quoteTabs) {
    if (out[key] === undefined) out[key] = 0;
  }
  return out;
}

const toQuoteViewData = (row: QuoteRow): QuoteViewData => ({
  _id: row._id,
  quote_id: row.quote_id,
  status: row.status,
  requested_services: row.requested_services,
  requested_partner: row.requested_partner,
  employee_id: row.employee_id,
  employee_name: row.employee_name,
  employee_phone: row.employee_phone,
  user_name: row.user_name,
  user_id: row.user_id,
  phone_number: row.phone_number,
  user_email: row.user_email,
  user_city: row.user_city ?? row.city,
  profile_url: row.profile_url,
  category_id: row.category_id,
  category_name: row.category_name,
  requested_date: row.requested_date,
  requested_time: row.requested_time,
  door_no: row.door_no,
  street: row.street,
  city: row.city,
  area: row.area,
  landmark: row.landmark,
  pincode: row.pincode,
  service_id: row.service_id,
  partner_id: row.partner_id,
  partner_name: row.partner_name,
  partner_user_id: row.partner_user_id,
  partner_phone: row.partner_phone,
  partner_city: row.partner_city,
  service_price: row.service_price,
  scheduled_date: row.scheduled_date,
  scheduled_time_from: row.service_from_time,
  scheduled_time_to: row.service_to_time,
  order_id: row.order_id,
  order_status: row.order_status,
  services_summary: row.services ?? row.requested_services,
  payment_method: row.payment_method,
  payment_status: row.payment_status,
  payment_reference: row.payment_reference,
  payment_date: row.payment_date,
});

const QuoteManagement = () => {
  const [selectedTab, setSelectedTab] = useState<QuoteTabKey>("new");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [utilitySearchKey, setUtilitySearchKey] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showAddQuote, setShowAddQuote] = useState(false);
  const { register: quoteFilterRegister, setValue: setQuoteFilterValue } =
    useForm<{
      from_date: string;
      to_date: string;
    }>({
      defaultValues: { from_date: "", to_date: "" },
    });
  const { register, setValue } = useForm<any>();
  const {
    register: addQuoteRegister,
    handleSubmit: handleAddQuoteSubmit,
    setValue: setAddQuoteValue,
    watch: watchAddQuote,
    reset: resetAddQuote,
    formState: { errors: addQuoteErrors },
  } = useForm<AddQuoteFormValues>({
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
    },
  });
  const addQuote = watchAddQuote();
  const [quoteCatalogServices, setQuoteCatalogServices] = useState<
    ServiceDropDownOption[]
  >([]);
  const [catalogPartnerRecords, setCatalogPartnerRecords] = useState<
    Record<string, unknown>[]
  >([]);
  const addQuoteServiceId = String(addQuote.requested_services ?? "").trim();
  const hasAddQuoteServiceSelected = Boolean(addQuoteServiceId);
  /** Single memo avoids TDZ / ordering issues between filtered services and derived schedule mode. */
  const { quoteServiceOptionsForCategory, scheduleMode } = useMemo(() => {
    const cid = String(addQuote.category_id ?? "").trim();
    const quoteServiceOptionsForCategory = !cid
      ? []
      : quoteCatalogServices.filter((o) => {
          const ref = normalizeServiceCategoryRef(o.category_id);
          return ref === cid;
        });
    const sid = String(addQuote.requested_services ?? "").trim();
    const opt = quoteServiceOptionsForCategory.find((o) => o.value === sid);
    return {
      quoteServiceOptionsForCategory,
      scheduleMode: getQuoteScheduleModeFromServiceOption({
        payment_type: opt?.payment_type,
        label: opt?.label ?? "",
      }),
    };
  }, [addQuote.category_id, addQuote.requested_services, quoteCatalogServices]);
  const isAddQuoteScheduleComplete = useMemo(() => {
    if (!hasAddQuoteServiceSelected) return false;
    const d = String(addQuote.requested_date ?? "").trim();
    const dTo = String(addQuote.requested_date_to ?? "").trim();
    const tFrom = String(addQuote.requested_time_from ?? "").trim();
    const tTo = String(addQuote.requested_time_to ?? "").trim();
    if (scheduleMode === "range") {
      return Boolean(d && dTo && tFrom && tTo);
    }
    return Boolean(d && tFrom && tTo);
  }, [
    hasAddQuoteServiceSelected,
    scheduleMode,
    addQuote.requested_date,
    addQuote.requested_date_to,
    addQuote.requested_time_from,
    addQuote.requested_time_to,
  ]);
  const [quotePartnerOptions, setQuotePartnerOptions] = useState<OptionType[]>(
    []
  );
  const [quoteUserOptions, setQuoteUserOptions] = useState<QuoteUserOption[]>(
    []
  );
  const [quoteEmployeeOptions, setQuoteEmployeeOptions] = useState<
    OptionType[]
  >([]);
  const [quoteCategoryOptions, setQuoteCategoryOptions] = useState<
    OptionType[]
  >([]);
  const currentUserRole = getLocalStorage(AppConstant.userRole);
  const isSuperAdminOrStaff =
    currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.STAFF;
  const [franchiseOptionsForQuote, setFranchiseOptionsForQuote] = useState<
    OptionType[]
  >([]);
  /** Franchise users: session partner id. Super admin/staff: no page-level franchise (pick in Add Quote only). */
  const effectiveFranchiseId = useMemo(() => {
    if (isSuperAdminOrStaff) return "";
    return String(getLocalStorage(AppConstant.partnerId) ?? "").trim();
  }, [isSuperAdminOrStaff]);
  const quoteScopeBlocked =
    !isSuperAdminOrStaff && !String(effectiveFranchiseId).trim();
  const franchiseIdForQuoteCatalog = useMemo(() => {
    if (isSuperAdminOrStaff && showAddQuote) {
      return String(addQuote.franchise_id ?? "").trim();
    }
    return effectiveFranchiseId;
  }, [
    isSuperAdminOrStaff,
    showAddQuote,
    addQuote.franchise_id,
    effectiveFranchiseId,
  ]);
  const addQuoteFieldsLocked =
    isSuperAdminOrStaff &&
    showAddQuote &&
    !String(addQuote.franchise_id ?? "").trim();
  const addQuoteSaveDisabled =
    isSuperAdminOrStaff && showAddQuote
      ? !String(addQuote.franchise_id ?? "").trim()
      : quoteScopeBlocked;
  const resetAddQuoteCatalogSelections = useCallback(() => {
    setAddQuoteValue("user_id", "", { shouldValidate: false });
    setAddQuoteValue("user_name", "", { shouldValidate: false });
    setAddQuoteValue("category_id", "", { shouldValidate: false });
    setAddQuoteValue("requested_services", "", { shouldValidate: false });
    setAddQuoteValue("requested_partner", "", { shouldValidate: false });
    setAddQuoteValue("employee_id", "", { shouldValidate: false });
    setAddQuoteValue("requested_date", "", { shouldValidate: false });
    setAddQuoteValue("requested_date_to", "", { shouldValidate: false });
    setAddQuoteValue("requested_time", "", { shouldValidate: false });
    setAddQuoteValue("requested_time_from", "", { shouldValidate: false });
    setAddQuoteValue("requested_time_to", "", { shouldValidate: false });
    setAddQuoteValue("service_price", "", { shouldValidate: false });
    setCreateQuoteAddressId("");
  }, [setAddQuoteValue]);

  /** Avoid applying stale `related-catalog` if the user switches franchise quickly. */
  const quoteCatalogLoadSeqRef = useRef(0);

  const loadQuoteCatalogForFranchise = useCallback(
    async (franchiseId: string) => {
      const id = String(franchiseId ?? "").trim();
      if (!id) {
        quoteCatalogLoadSeqRef.current += 1;
        setQuoteCatalogServices([]);
        setQuoteCategoryOptions([]);
        setQuoteEmployeeOptions([]);
        setCatalogPartnerRecords([]);
        setQuotePartnerOptions([]);
        setQuoteFranchiseCatalogSnapshot(null);
        return;
      }
      const seq = (quoteCatalogLoadSeqRef.current += 1);
      const { success, record } = await fetchFranchiseRelatedCatalog(id);
      if (seq !== quoteCatalogLoadSeqRef.current) return;
      if (!success || !record) {
        setQuoteCatalogServices([]);
        setQuoteCategoryOptions([]);
        setQuoteEmployeeOptions([]);
        setCatalogPartnerRecords([]);
        setQuotePartnerOptions([]);
        setQuoteFranchiseCatalogSnapshot(null);
        return;
      }
      const mapped = mapRelatedCatalogToQuoteOptions(record);
      setQuoteCategoryOptions(mapped.quoteCategoryOptions);
      setQuoteCatalogServices(mapped.quoteCatalogServices);
      setQuoteEmployeeOptions(mapped.quoteEmployeeOptions);
      setCatalogPartnerRecords(mapped.quotePartnerRecords);
      setQuoteFranchiseCatalogSnapshot({
        partnerRecords: mapped.quotePartnerRecords,
        employeeRows: mapped.quoteEmployeeRecords,
      });
    },
    []
  );

  const handleAddQuoteFranchiseChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const nextId = String(e.target.value ?? "").trim();
      setAddQuoteValue("franchise_id", e.target.value, { shouldValidate: true });
      resetAddQuoteCatalogSelections();
      if (isSuperAdminOrStaff) {
        void loadQuoteCatalogForFranchise(nextId);
      }
    },
    [
      isSuperAdminOrStaff,
      loadQuoteCatalogForFranchise,
      resetAddQuoteCatalogSelections,
      setAddQuoteValue,
    ]
  );
  const [createQuoteAddressId, setCreateQuoteAddressId] = useState("");
  const [addQuoteCustomerAddress, setAddQuoteCustomerAddress] = useState<{
    ready: boolean;
    summary: string;
  }>({ ready: false, summary: "" });

  const userSelectOptions = useMemo<OptionType[]>(
    () => quoteUserOptions.map((u) => ({ value: u.value, label: u.label })),
    [quoteUserOptions]
  );

  const [quoteRows, setQuoteRows] = useState<QuoteRow[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [quoteCountsByTab, setQuoteCountsByTab] = useState<
    Partial<Record<QuoteTabKey, number>>
  >({});
  const [sortBy, setSortBy] = useState<QuoteListSort>([]);

  const fetchRef = useRef(false);
  /** First list load runs after tab totals (`getCount`); later filter/tab/page changes only refetch the active tab list. */
  const quoteCountsBootstrappedRef = useRef(false);

  const quoteListFilters = useMemo(
    () => ({
      keyword: searchKeyword,
      from_date: fromDate,
      to_date: toDate,
      franchise_id: effectiveFranchiseId || undefined,
    }),
    [searchKeyword, fromDate, toDate, effectiveFranchiseId]
  );

  const fetchData = useCallback(async () => {
    if (!isSuperAdminOrStaff && !effectiveFranchiseId) {
      setQuoteRows([]);
      setTotalPages(0);
      return;
    }
    if (fetchRef.current) return;
    fetchRef.current = true;
    try {
      const res = await fetchQuotes(
        selectedTab,
        currentPage,
        pageSize,
        quoteListFilters,
        sortBy
      );
      if (res.response) {
        setQuoteRows(res.quotes);
        setTotalPages(res.totalPages);
      } else {
        setQuoteRows([]);
        setTotalPages(0);
      }
    } finally {
      fetchRef.current = false;
    }
  }, [
    currentPage,
    effectiveFranchiseId,
    isSuperAdminOrStaff,
    pageSize,
    quoteListFilters,
    selectedTab,
    sortBy,
  ]);

  /** Tab badges: `POST /getCount` with `{ type: "quote-management" }` only (no N×`getAll` fallback — avoids spamming every tab on staging shape drift). */
  const refreshQuoteSummaryFromGetCount = useCallback(async () => {
    const { responseCount, countModel } = await getCount("quote-management");
    const rec =
      countModel != null
        ? (countModel as unknown as Record<string, unknown>)
        : null;
    const mapped =
      responseCount && rec ? mapGetCountRecordToQuoteTabCounts(rec) : null;
    if (mapped) {
      setQuoteCountsByTab(mapped);
      return;
    }
    setQuoteCountsByTab({});
  }, []);

  const refreshCountsThenFetchQuotes = useCallback(() => {
    return refreshQuoteSummaryFromGetCount().then(() => fetchData());
  }, [fetchData, refreshQuoteSummaryFromGetCount]);

  const handleServerSortChange = useCallback(
    (next: { id: string; desc: boolean }[]) => {
      setSortBy(normalizeQuoteListSort(next as QuoteListSort));
      setCurrentPage(1);
    },
    []
  );

  /** Franchise dropdown for super admin/staff (page scope). */
  useEffect(() => {
    if (!isSuperAdminOrStaff) return;
    let cancelled = false;
    (async () => {
      const rows = await fetchFranchiseDropDown();
      if (cancelled) return;
      setFranchiseOptionsForQuote(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [isSuperAdminOrStaff]);

  useEffect(() => {
    if (!showAddQuote) return;
    void loadQuoteCatalogForFranchise(franchiseIdForQuoteCatalog);
  }, [
    showAddQuote,
    franchiseIdForQuoteCatalog,
    loadQuoteCatalogForFranchise,
  ]);

  useEffect(() => {
    const sid = String(addQuote.requested_services ?? "").trim();
    const src = filterCatalogPartnerRecordsByService(
      catalogPartnerRecords,
      sid || undefined
    );
    const opts = src.map((p) => {
      const value = String(
        p.partner_id ?? p._id ?? p.user_id ?? p.id ?? ""
      ).trim();
      const label = String(
        p.partner_name ?? p.name ?? p.user_name ?? value
      ).trim();
      return { value, label: label || value };
    });
    setQuotePartnerOptions(opts.filter((o) => o.value));
  }, [addQuote.requested_services, catalogPartnerRecords]);

  useEffect(() => {
    const uid = String(addQuote.user_id ?? "").trim();
    if (!uid) {
      setCreateQuoteAddressId("");
      setAddQuoteCustomerAddress({ ready: false, summary: "" });
      return;
    }
    setAddQuoteCustomerAddress({ ready: false, summary: "" });
    let cancelled = false;
    (async () => {
      const res = await fetchUserById(uid);
      if (cancelled) return;
      if (!res.response || !res.user) {
        setCreateQuoteAddressId("");
        setAddQuoteCustomerAddress({ ready: true, summary: "" });
        return;
      }
      const u = res.user as unknown as Record<string, unknown>;
      const { addressId, summary } = resolveAddressIdAndSummaryFromUser(u);
      setCreateQuoteAddressId(addressId);
      setAddQuoteCustomerAddress({ ready: true, summary });
    })();
    return () => {
      cancelled = true;
    };
  }, [addQuote.user_id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!quoteCountsBootstrappedRef.current) {
        await refreshQuoteSummaryFromGetCount();
        quoteCountsBootstrappedRef.current = true;
        if (cancelled) return;
      }
      await fetchData();
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchData, refreshQuoteSummaryFromGetCount]);

  useEffect(
    () => () => {
      setQuoteFranchiseCatalogSnapshot(null);
    },
    []
  );

  const handleTabClick = (tabKey: QuoteTabKey) => {
    setSelectedTab(tabKey);
    setCurrentPage(1);
    setSortBy([]);
  };

  const handleVoidQuote = useCallback((quote: QuoteRow) => {
    const qid = String(quote._id ?? "").trim();
    openConfirmDialog(
      `Delete quote ${quote.quote_id}? This cannot be undone.`,
      "Delete",
      "Cancel",
      async () => {
        if (!qid) {
          showErrorAlert("Missing quote id.");
          return;
        }
        const ok = await deleteQuote(qid);
        if (ok) {
          showSuccessAlert("Quote deleted.");
          void refreshCountsThenFetchQuotes();
        }
      }
    );
  }, [refreshCountsThenFetchQuotes]);

  const handleOpenCreateQuoteModal = useCallback(() => {
    setShowAddQuote(true);
    if (isSuperAdminOrStaff) return;
    const fid = String(effectiveFranchiseId ?? "").trim();
    if (fid) void loadQuoteCatalogForFranchise(fid);
  }, [
    isSuperAdminOrStaff,
    effectiveFranchiseId,
    loadQuoteCatalogForFranchise,
  ]);

  const handleQuoteView = useCallback(
    (row: QuoteRow) => {
      void import("./QuoteInfoDialog").then(({ default: QuoteInfoDialog }) => {
        QuoteInfoDialog.show(toQuoteViewData(row), () => {
          void refreshCountsThenFetchQuotes();
        });
      });
    },
    [refreshCountsThenFetchQuotes]
  );

  const quoteColumns = useMemo(() => {
    const actionColumn = {
      Header: "Action",
      accessor: "action",
      Cell: ({ row }: { row: any }) => (
        <CustomActionColumn
          row={row}
          onView={() => handleQuoteView(row.original as QuoteRow)}
          onDelete={() => handleVoidQuote(row.original as QuoteRow)}
        />
      ),
    };

    const scheduleSortAccessor =
      selectedTab === "success" || selectedTab === "accepted"
        ? "scheduled_date"
        : "requested_date";

    const cols: any[] = [
      {
        Header: "SR No",
        accessor: "serial_no",
        Cell: ({ row }: { row: any }) =>
          (currentPage - 1) * pageSize + row.index + 1,
      },
    ];

    if (selectedTab === "success") {
      cols.push({
        Header: "Order ID",
        accessor: "order_id",
        Cell: ({ row }: { row: any }) => row.original.order_id ?? "-",
      });
    }

    cols.push(
      {
        Header: "Service",
        accessor: selectedTab === "success" ? "services" : "requested_services",
        sort: true,
        Cell: ({ row }: { row: any }) =>
          selectedTab === "success"
            ? row.original.services ?? row.original.requested_services ?? "-"
            : row.original.requested_services,
      },
      {
        Header: "Partner",
        accessor:
          selectedTab === "success" ? "partner_name" : "requested_partner",
        sort: true,
        Cell: ({ row }: { row: any }) =>
          selectedTab === "success"
            ? row.original.partner_name ?? "-"
            : row.original.requested_partner,
      },
      { Header: "User Name", accessor: "user_name", sort: true },
      {
        Header: "Price",
        accessor: "service_price",
        Cell: ({ row }: { row: any }) => `₹${row.original.service_price ?? 0}`,
      },
      {
        Header: "Schedule date and time",
        accessor: scheduleSortAccessor,
        Cell: ({ row }: { row: any }) => (
          <span style={{ whiteSpace: "pre-line" }}>
            {formatQuoteScheduleForTable(row.original as QuoteRow, selectedTab)}
          </span>
        ),
      },
      {
        Header: "Address",
        accessor: "address",
        Cell: ({ row }: { row: any }) =>
          `${row.original.door_no}, ${row.original.street}, ${row.original.city}`,
      },
      actionColumn
    );

    return cols;
  }, [currentPage, pageSize, selectedTab, handleQuoteView, handleVoidQuote]);

  useEffect(() => {
    if (!showAddQuote) return;
    resetAddQuote({
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
    });
  }, [showAddQuote, resetAddQuote]);

  const onSubmitAddQuote = async (data: AddQuoteFormValues) => {
    const price = Number.parseFloat(String(data.service_price).trim());
    if (Number.isNaN(price) || price < 0) {
      showErrorAlert("Enter a valid service price.");
      return;
    }

    const franchiseId = resolveFranchiseIdForQuoteForm(data.franchise_id);
    if (
      !franchiseId &&
      (currentUserRole === UserRole.FRANCHISE_ADMIN ||
        currentUserRole === UserRole.EMPLOYEE)
    ) {
      showErrorAlert("Franchise is not set for this session.");
      return;
    }
    if (!franchiseId && isSuperAdminOrStaff) {
      showErrorAlert("Please select a franchise.");
      return;
    }

    if (!createQuoteAddressId.trim()) {
      showErrorAlert(
        "No saved address id found for this user. Ensure the customer has an address on file."
      );
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
      if (!String(data.requested_time_from ?? "").trim()) {
        showErrorAlert("Please select start time.");
        return;
      }
      if (!String(data.requested_time_to ?? "").trim()) {
        showErrorAlert("Please select end time.");
        return;
      }
    } else {
      if (!String(data.requested_date ?? "").trim()) {
        showErrorAlert("Please select a date.");
        return;
      }
      if (!String(data.requested_time_from ?? "").trim()) {
        showErrorAlert("Please select start time.");
        return;
      }
      if (!String(data.requested_time_to ?? "").trim()) {
        showErrorAlert("Please select end time.");
        return;
      }
    }

    const body = buildCreateQuotePayload({
      user_id: data.user_id,
      category_id: data.category_id,
      service_id: data.requested_services,
      partner_id: data.requested_partner || undefined,
      employee_id: data.employee_id || undefined,
      service_price: price,
      franchise_id: franchiseId,
      address_id: createQuoteAddressId.trim(),
      scheduleMode,
      requested_date: data.requested_date,
      requested_date_to: data.requested_date_to,
      requested_time: data.requested_time,
      requested_time_from: data.requested_time_from,
      requested_time_to: data.requested_time_to,
    });

    if (!body) {
      showErrorAlert("Missing required fields.");
      return;
    }

    const ok = await createQuote(body);
    if (ok) {
      setShowAddQuote(false);
      setCreateQuoteAddressId("");
      setAddQuoteCustomerAddress({ ready: false, summary: "" });
      showSuccessAlert("Quote created.");
      void refreshCountsThenFetchQuotes();
    }
  };

  return (
    <div className="main-page-content">
      <CustomHeader
        title="Quote Management"
        rightActions={
          <button
            type="button"
            className="custom-btn-secondary w-auto"
            disabled={!isSuperAdminOrStaff && quoteScopeBlocked}
            onClick={handleOpenCreateQuoteModal}
          >
            Create Quote
          </button>
        }
        register={register}
        setValue={setValue}
      />

      {!isSuperAdminOrStaff && quoteScopeBlocked ? (
        <div className="mt-3 px-2 text-muted small">
          Franchise is not available for this session. Quote lists and actions
          stay disabled until it is configured.
        </div>
      ) : null}

      <div
        className="d-flex mt-4 gap-2"
        style={
          quoteScopeBlocked
            ? {
                pointerEvents: "none",
                opacity: 0.55,
                userSelect: "none",
              }
            : undefined
        }
      >
        {quoteTabs.map((tab) => (
          <CustomSummaryBox
            key={tab.key}
            divId={`quote-tab-${tab.key}`}
            title={tab.label}
            data={{ Total: quoteCountsByTab[tab.key] ?? 0 }}
            onSelect={() => handleTabClick(tab.key)}
            isSelected={selectedTab === tab.key}
            onFilterChange={() => {}}
            isAddShow={false}
          />
        ))}
      </div>

      <div
        style={
          quoteScopeBlocked
            ? {
                pointerEvents: "none",
                opacity: 0.55,
                userSelect: "none",
              }
            : undefined
        }
      >
      <CustomUtilityBox
        key={utilitySearchKey}
        title="Quotes"
        searchHint={"Search service"}
        toolsInlineRow
        hideMoreIcon
        controlSlot={
          <>
            <div style={{ minWidth: "220px" }}>
              <Form.Label className="mb-1 fw-medium">From Date</Form.Label>
              <CustomDatePicker
                label=""
                controlId="from_date"
                selectedDate={fromDate}
                onChange={(date) => {
                  const next = toIsoCalendarDate(date);
                  setFromDate(next);
                  setCurrentPage(1);
                }}
                register={
                  quoteFilterRegister as unknown as UseFormRegister<any>
                }
                setValue={
                  setQuoteFilterValue as (name: string, value: any) => void
                }
                asCol={false}
                groupClassName="mb-0 w-100"
                placeholderText="From Date"
                filterDate={() => true}
              />
            </div>
            <div style={{ minWidth: "220px" }}>
              <Form.Label className="mb-1 fw-medium">To Date</Form.Label>
              <CustomDatePicker
                label=""
                controlId="to_date"
                selectedDate={toDate}
                onChange={(date) => {
                  const next = toIsoCalendarDate(date);
                  setToDate(next);
                  setCurrentPage(1);
                }}
                register={
                  quoteFilterRegister as unknown as UseFormRegister<any>
                }
                setValue={
                  setQuoteFilterValue as (name: string, value: any) => void
                }
                asCol={false}
                groupClassName="mb-0 w-100"
                placeholderText="To Date"
                filterDate={() => true}
              />
            </div>
          </>
        }
        afterSearchSlot={
          <Button
            variant="outline-secondary"
            size="sm"
            className="custom-btn-secondary partner-payout-clear-btn px-3"
            type="button"
            disabled={!fromDate && !toDate && !searchKeyword.trim()}
            onClick={() => {
              setFromDate(null);
              setToDate(null);
              setSearchKeyword("");
              setQuoteFilterValue("from_date", "");
              setQuoteFilterValue("to_date", "");
              setUtilitySearchKey((k) => k + 1);
              setCurrentPage(1);
              setSortBy([]);
            }}
          >
            Clear
          </Button>
        }
        hideUtilityActions
        onSearch={(value) => {
          setSearchKeyword(value);
          setCurrentPage(1);
        }}
        syncKeyword={searchKeyword}
      />

      <CustomTable
        columns={quoteColumns}
        data={quoteRows}
        pageSize={pageSize}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(page: number) => setCurrentPage(page)}
        onLimitChange={(updatedPageSize: number) => {
          setPageSize(updatedPageSize);
          setCurrentPage(1);
        }}
        manualSortBy
        sortBy={sortBy}
        onSortChange={handleServerSortChange}
        theadClass="table-light"
      />
      </div>

      <Modal
        show={showAddQuote}
        onHide={() => setShowAddQuote(false)}
        centered
        size="lg"
        enforceFocus={false}
      >
        <Modal.Header className="py-3 px-4 border-bottom-0">
          <Modal.Title as="h5" className="custom-modal-title">
            Add Quote
          </Modal.Title>
          <CustomCloseButton onClose={() => setShowAddQuote(false)} />
        </Modal.Header>
        <Modal.Body className="px-4 pb-4 pt-0">
          <form
            id="quote-add-form"
            noValidate
            onSubmit={handleAddQuoteSubmit(onSubmitAddQuote)}
          >
            <section
              className="custom-other-details"
              style={{ padding: "10px" }}
            >
              {isSuperAdminOrStaff ? (
                <Row>
                  <Col xs={12} md={6} className="mt-2">
                    <Row className="align-items-start">
                      <Col sm={4} className="d-flex align-items-start">
                        <label
                          htmlFor="add-quote-franchise"
                          className="custom-profile-lable"
                        >
                          Franchise
                        </label>
                      </Col>
                      <Col>
                        <Form.Select
                          id="add-quote-franchise"
                          className="form-select custom-form-input"
                          value={String(addQuote.franchise_id ?? "")}
                          onChange={handleAddQuoteFranchiseChange}
                          style={{
                            boxShadow: "none",
                            borderRadius: "8px",
                            borderColor: "var(--primary-color)",
                            fontSize: "14px",
                            fontWeight: "normal",
                            width: "100%",
                            height: "35px",
                            lineHeight: "18px",
                            backgroundColor: "var(--bg-color)",
                            fontFamily: "'Inter'",
                            color: "var(--content-txt-color)",
                            marginBottom: "10px",
                          }}
                        >
                          <option value="">Select franchise…</option>
                          {franchiseOptionsForQuote.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </Form.Select>
                      </Col>
                    </Row>
                  </Col>
                </Row>
              ) : null}
              <div
                style={
                  addQuoteFieldsLocked
                    ? {
                        pointerEvents: "none",
                        opacity: 0.55,
                        userSelect: "none",
                      }
                    : undefined
                }
              >
                <Row>
                <Col xs={12} md={6} className="mt-2">
                  <CustomTextFieldSelect
                    label="User Name"
                    controlId="add-quote-user"
                    asCol={false}
                    options={userSelectOptions}
                    register={
                      addQuoteRegister as unknown as UseFormRegister<any>
                    }
                    fieldName="user_id"
                    error={addQuoteErrors.user_id}
                    requiredMessage="Please select a user"
                    defaultValue={addQuote.user_id}
                    setValue={
                      setAddQuoteValue as (name: string, value: any) => void
                    }
                    placeholder="Search user"
                    menuPortal
                    isClearable
                    onChange={(e) => {
                      const uid = String(e.target.value || "");
                      const row = quoteUserOptions.find((u) => u.value === uid);
                      setAddQuoteValue("user_name", row?.user_name ?? "", {
                        shouldValidate: true,
                      });
                    }}
                    isDisabled={addQuoteFieldsLocked}
                  />
                </Col>
                <Col xs={12} md={6} className="mt-2">
                  <CustomTextFieldSelect
                    label="Requested Partner"
                    controlId="add-quote-partner"
                    asCol={false}
                    options={quotePartnerOptions}
                    register={
                      addQuoteRegister as unknown as UseFormRegister<any>
                    }
                    fieldName="requested_partner"
                    error={addQuoteErrors.requested_partner}
                    defaultValue={addQuote.requested_partner}
                    setValue={
                      setAddQuoteValue as (name: string, value: any) => void
                    }
                    placeholder="Select partner"
                    menuPortal
                    isClearable
                    isDisabled={addQuoteFieldsLocked}
                  />
                </Col>
                </Row>
                <Row>
                <Col xs={12} md={6} className="mt-2">
                  <CustomTextFieldSelect
                    label="Category"
                    controlId="add-quote-category"
                    asCol={false}
                    options={quoteCategoryOptions}
                    register={
                      addQuoteRegister as unknown as UseFormRegister<any>
                    }
                    fieldName="category_id"
                    error={addQuoteErrors.category_id}
                    requiredMessage="Please select a category"
                    defaultValue={addQuote.category_id}
                    isClearable
                    setValue={(name: string, value: any) => {
                      setAddQuoteValue(
                        name as keyof AddQuoteFormValues,
                        value,
                        { shouldValidate: true }
                      );
                      if (name === "category_id") {
                        setAddQuoteValue("requested_services", "", {
                          shouldValidate: false,
                        });
                        setAddQuoteValue("requested_date", "", {
                          shouldValidate: false,
                        });
                        setAddQuoteValue("requested_date_to", "", {
                          shouldValidate: false,
                        });
                        setAddQuoteValue("requested_time", "", {
                          shouldValidate: false,
                        });
                        setAddQuoteValue("requested_time_from", "", {
                          shouldValidate: false,
                        });
                        setAddQuoteValue("requested_time_to", "", {
                          shouldValidate: false,
                        });
                        setAddQuoteValue("service_price", "", {
                          shouldValidate: false,
                        });
                        if (!String(value ?? "").trim()) {
                          setAddQuoteValue("requested_partner", "", {
                            shouldValidate: false,
                          });
                          setAddQuoteValue("employee_id", "", {
                            shouldValidate: false,
                          });
                        }
                      }
                    }}
                    placeholder="Select category"
                    menuPortal
                    isDisabled={addQuoteFieldsLocked}
                  />
                </Col>
                <Col xs={12} md={6} className="mt-2">
                  <CustomTextFieldSelect
                    key={`add-quote-svc-${addQuote.category_id || "none"}`}
                    label="Requested Services"
                    controlId="add-quote-service"
                    asCol={false}
                    options={quoteServiceOptionsForCategory}
                    register={
                      addQuoteRegister as unknown as UseFormRegister<any>
                    }
                    fieldName="requested_services"
                    error={addQuoteErrors.requested_services}
                    requiredMessage={
                      addQuote.category_id
                        ? "Please select a service"
                        : undefined
                    }
                    defaultValue={addQuote.requested_services}
                    setValue={(name: string, value: any) => {
                      setAddQuoteValue(
                        name as keyof AddQuoteFormValues,
                        value,
                        { shouldValidate: true }
                      );
                      if (name === "requested_services") {
                        setAddQuoteValue("requested_date", "", {
                          shouldValidate: false,
                        });
                        setAddQuoteValue("requested_date_to", "", {
                          shouldValidate: false,
                        });
                        setAddQuoteValue("requested_time", "", {
                          shouldValidate: false,
                        });
                        setAddQuoteValue("requested_time_from", "", {
                          shouldValidate: false,
                        });
                        setAddQuoteValue("requested_time_to", "", {
                          shouldValidate: false,
                        });
                        setAddQuoteValue("service_price", "", {
                          shouldValidate: false,
                        });
                        if (!String(value ?? "").trim()) {
                          setAddQuoteValue("requested_partner", "", {
                            shouldValidate: false,
                          });
                        }
                      }
                    }}
                    placeholder={
                      addQuote.category_id
                        ? "Select service"
                        : "Select category first"
                    }
                    menuPortal
                    isClearable
                    isDisabled={addQuoteFieldsLocked}
                  />
                </Col>
                </Row>
                <Row>
                <Col xs={12} md={6} className="mt-2">
                  <CustomTextFieldSelect
                    label="Employee"
                    controlId="add-quote-employee"
                    asCol={false}
                    options={quoteEmployeeOptions}
                    register={
                      addQuoteRegister as unknown as UseFormRegister<any>
                    }
                    fieldName="employee_id"
                    error={addQuoteErrors.employee_id}
                    defaultValue={addQuote.employee_id}
                    setValue={
                      setAddQuoteValue as (name: string, value: any) => void
                    }
                    placeholder="Select employee"
                    menuPortal
                    isClearable
                    isDisabled={addQuoteFieldsLocked}
                  />
                </Col>
                </Row>

                {String(addQuote.user_id ?? "").trim() ? (
                  <Row className="mt-3">
                    <Col xs={12}>
                      <label
                        className="custom-profile-lable d-block mb-2"
                        style={{ fontWeight: 600 }}
                      >
                        Customer address
                      </label>
                      {!addQuoteCustomerAddress.ready ? (
                        <div className="small text-muted">
                          Loading customer address…
                        </div>
                      ) : addQuoteCustomerAddress.summary ? (
                        <div
                          className="small rounded border p-3"
                          style={{
                            backgroundColor: "var(--bg-color)",
                            borderColor: "var(--primary-color)",
                            color: "var(--content-txt-color)",
                            lineHeight: 1.5,
                          }}
                        >
                          {addQuoteCustomerAddress.summary}
                        </div>
                      ) : !createQuoteAddressId.trim() ? (
                        <div className="small text-warning">
                          No saved address on file for this customer. Add an
                          address to the user profile before creating a quote.
                        </div>
                      ) : (
                        <div className="small text-muted">
                          Address is linked for this quote; details were not
                          returned by the server.
                        </div>
                      )}
                    </Col>
                  </Row>
                ) : null}

              {hasAddQuoteServiceSelected ? (
                <>
                  <Row className="mt-3 mb-2">
                    <Col xs={12}>
                      <label
                        style={{
                          fontSize: "17px",
                          fontWeight: "600",
                          color: "var(--primary-color)",
                        }}
                        className="d-block mb-1"
                      >
                        Schedule date and time
                      </label>
                      <div className="small text-muted">
                        {scheduleMode === "range"
                          ? "Per day / per month: from date, to date, start time, end time."
                          : "Per hour / per consultancy: one date, start time, end time."}
                      </div>
                      {!isAddQuoteScheduleComplete ? (
                        <div className="small text-muted mt-1">
                          Fill all schedule fields to enter service price.
                        </div>
                      ) : null}
                    </Col>
                  </Row>

                  <Row className="g-2">
                    {scheduleMode === "range" ? (
                  <>
                    <Col xs={12} md={3} className="mt-2">
                      <CustomTextFieldDatePicket
                        label="From date"
                        controlId="requested_date"
                        selectedDate={addQuote.requested_date || null}
                        onChange={(date) => {
                          const next = toIsoCalendarDate(date) ?? "";
                          setAddQuoteValue("requested_date", next, {
                            shouldValidate: true,
                          });
                        }}
                        register={
                          addQuoteRegister as unknown as UseFormRegister<any>
                        }
                        setValue={
                          setAddQuoteValue as (name: string, value: any) => void
                        }
                        asCol={false}
                        labelSize={12}
                        placeholderText="From date"
                        filterDate={() => true}
                      />
                    </Col>
                    <Col xs={12} md={3} className="mt-2">
                      <CustomTextFieldDatePicket
                        label="To date"
                        controlId="requested_date_to"
                        selectedDate={addQuote.requested_date_to || null}
                        onChange={(date) => {
                          const next = toIsoCalendarDate(date) ?? "";
                          setAddQuoteValue("requested_date_to", next, {
                            shouldValidate: true,
                          });
                        }}
                        register={
                          addQuoteRegister as unknown as UseFormRegister<any>
                        }
                        setValue={
                          setAddQuoteValue as (name: string, value: any) => void
                        }
                        asCol={false}
                        labelSize={12}
                        placeholderText="To date"
                        filterDate={() => true}
                      />
                    </Col>
                    <Col xs={12} md={3} className="mt-2">
                      <CustomTextFieldTimePicket
                        label="Start time"
                        controlId="requested_time_from"
                        selectedTime={timeStorageOrNull(
                          addQuote.requested_time_from
                        )}
                        onChange={(date) =>
                          setAddQuoteValue(
                            "requested_time_from",
                            toTimeStorageFromDate(date),
                            { shouldValidate: true }
                          )
                        }
                        placeholderText="Select start time"
                        error={addQuoteErrors.requested_time_from}
                        register={addQuoteRegister}
                        validation={{
                          required: "Start time is required",
                        }}
                        setValue={setAddQuoteValue}
                        asCol={false}
                        labelSize={12}
                        filterTime={(time) => {
                          const hour = time.getHours();
                          return hour >= 8 && hour <= 23;
                        }}
                      />
                    </Col>
                    <Col xs={12} md={3} className="mt-2">
                      <CustomTextFieldTimePicket
                        label="End time"
                        controlId="requested_time_to"
                        selectedTime={timeStorageOrNull(
                          addQuote.requested_time_to
                        )}
                        onChange={(date) =>
                          setAddQuoteValue(
                            "requested_time_to",
                            toTimeStorageFromDate(date),
                            { shouldValidate: true }
                          )
                        }
                        placeholderText="Select end time"
                        error={addQuoteErrors.requested_time_to}
                        register={addQuoteRegister}
                        validation={{
                          required: "End time is required",
                        }}
                        setValue={setAddQuoteValue}
                        asCol={false}
                        labelSize={12}
                        filterTime={(time) => {
                          const hour = time.getHours();
                          return hour >= 8 && hour <= 23;
                        }}
                      />
                    </Col>
                  </>
                ) : (
                  <>
                    <Col xs={12} md={4} className="mt-2">
                      <CustomTextFieldDatePicket
                        label="Date"
                        controlId="requested_date"
                        selectedDate={addQuote.requested_date || null}
                        onChange={(date) => {
                          const next = toIsoCalendarDate(date) ?? "";
                          setAddQuoteValue("requested_date", next, {
                            shouldValidate: true,
                          });
                        }}
                        register={
                          addQuoteRegister as unknown as UseFormRegister<any>
                        }
                        setValue={
                          setAddQuoteValue as (name: string, value: any) => void
                        }
                        asCol={false}
                        labelSize={12}
                        placeholderText="Select date"
                        filterDate={() => true}
                      />
                    </Col>
                    <Col xs={12} md={4} className="mt-2">
                      <CustomTextFieldTimePicket
                        label="Start time"
                        controlId="requested_time_from"
                        selectedTime={timeStorageOrNull(
                          addQuote.requested_time_from
                        )}
                        onChange={(date) =>
                          setAddQuoteValue(
                            "requested_time_from",
                            toTimeStorageFromDate(date),
                            { shouldValidate: true }
                          )
                        }
                        placeholderText="Select start time"
                        error={addQuoteErrors.requested_time_from}
                        register={addQuoteRegister}
                        validation={{
                          required: "Start time is required",
                        }}
                        setValue={setAddQuoteValue}
                        asCol={false}
                        labelSize={12}
                        filterTime={(time) => {
                          const hour = time.getHours();
                          return hour >= 8 && hour <= 23;
                        }}
                      />
                    </Col>
                    <Col xs={12} md={4} className="mt-2">
                      <CustomTextFieldTimePicket
                        label="End time"
                        controlId="requested_time_to"
                        selectedTime={timeStorageOrNull(
                          addQuote.requested_time_to
                        )}
                        onChange={(date) =>
                          setAddQuoteValue(
                            "requested_time_to",
                            toTimeStorageFromDate(date),
                            { shouldValidate: true }
                          )
                        }
                        placeholderText="Select end time"
                        error={addQuoteErrors.requested_time_to}
                        register={addQuoteRegister}
                        validation={{
                          required: "End time is required",
                        }}
                        setValue={setAddQuoteValue}
                        asCol={false}
                        labelSize={12}
                        filterTime={(time) => {
                          const hour = time.getHours();
                          return hour >= 8 && hour <= 23;
                        }}
                      />
                    </Col>
                  </>
                )}
              </Row>
                </>
              ) : null}
              {hasAddQuoteServiceSelected && isAddQuoteScheduleComplete ? (
                <Row className="mt-2">
                  <Col xs={12} md={6} className="mt-2">
                    <CustomTextField
                      label="Service Price"
                      controlId="service_price"
                      placeholder="Enter price"
                      register={addQuoteRegister}
                      error={addQuoteErrors.service_price}
                      asCol={false}
                      inputType="text"
                      isEditable={!addQuoteFieldsLocked}
                    />
                  </Col>
                </Row>
              ) : null}
              </div>
            </section>
          </form>
        </Modal.Body>
        <Modal.Footer className="px-4 pb-4 pt-4 border-top-0">
          <Button
            type="submit"
            form="quote-add-form"
            className="custom-btn-primary"
            disabled={addQuoteSaveDisabled}
          >
            Save
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowAddQuote(false)}
          >
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default QuoteManagement;
