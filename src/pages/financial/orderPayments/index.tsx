import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import { Button, Col, Form, Row } from "react-bootstrap";
import type { UseFormRegister } from "react-hook-form";
import CustomHeader from "../../../components/CustomHeader";
import { FinancialSubPageBackButton } from "../../../components/FinancialSubPageNav";
import CustomUtilityBox from "../../../components/CustomUtilityBox";
import CustomFormSelect from "../../../components/CustomFormSelect";
import CustomDatePicker from "../../../components/CustomDatePicker";
import {
  formatDate,
  priceCell,
  textUnderlineCell,
} from "../../../helper/utility";
import { AppConstant } from "../../../lib/global/AppConstant";
import { useFranchiseHeaderForm } from "../../../lib/global/hooks/useFranchiseScopedGetCount";
import { franchiseIdForApiQuery } from "../../../lib/franchise/headerFranchisePreference";
import CustomTable from "../../../components/CustomTable";
import {
  fetchFinancial,
  FinancialListFilters,
} from "../../../services/financialService";
import { getCount } from "../../../services/getCountService";
import { FinancialModel } from "../../../lib/models/FinancialModel";
import { showOrderInfoDialog } from "../../../components/order";
import { showUserDetailsDialog } from "../../../components/user";
import { ROUTES } from "../../../routes/Routes";
import type { ServerTableSortBy } from "../../../lib/global/serverTableSort";
import {
  CUSTOMER_PAYMENT_STATUS_FILTER_OPTIONS,
  PARTNER_PAYMENT_STATUS_FILTER_OPTIONS,
  customerPaymentStatusLabelFromSlug,
  partnerPaymentStatusLabelFromSlug,
} from "../../../lib/financial/paymentStatus";

/** Live `GET /financial-order/getAll` (set true only for offline UI work). */
const USE_MOCK_ORDER_PAYMENTS = false;

const MOCK_ORDER_PAYMENTS_ROWS: FinancialModel[] = [
  {
    _id: "mock-op-1",
    order_id: "ord-1001",
    order_unique_id: "ORD-1001",
    user_id: "user-1",
    user_name: "Arjun Sharma",
    partner_id: "partner-1",
    partner_name: "Rahul Service Pro",
    category_id: "cat-1",
    service_status: 3,
    order_status: "completed",
    payment_mode_id: 1,
    service_id: "svc-1",
    service_date: "2026-04-20",
    service_from_time: "10:00",
    service_to_time: "11:00",
    sub_total: 900,
    tax: 162,
    user_paltform_fee: 0,
    partner_commison_platform_fee: 0,
    service_price: 900,
    total_price: 1062,
    partner_earning: 820,
    admin_earning: 242,
    commission_percentage: 10,
    tax_percentage: 18,
    customer_paid_amount: 1062,
    customer_pending_amount: 0,
    total_service_amount: 900,
    paid_to_partner: 600,
    pending_to_partner: 300,
    is_paid: true,
    cancellation_reasone: null,
    rating: 0,
    service_name: "AC Service",
    category_name: "Home Services",
    deleted_at: null,
    created_at: "2026-04-20T10:00:00.000Z",
    updated_at: "2026-04-20T10:00:00.000Z",
  },
  {
    _id: "mock-op-2",
    order_id: "ord-1002",
    order_unique_id: "ORD-1002",
    user_id: "user-2",
    user_name: "Nisha Verma",
    partner_id: "partner-2",
    partner_name: "Mech Experts",
    category_id: "cat-2",
    service_status: 2,
    order_status: "in_progress",
    payment_mode_id: 1,
    service_id: "svc-2",
    service_date: "2026-04-22",
    service_from_time: "14:00",
    service_to_time: "15:00",
    sub_total: 1200,
    tax: 216,
    user_paltform_fee: 0,
    partner_commison_platform_fee: 0,
    service_price: 1200,
    total_price: 1416,
    partner_earning: 1080,
    admin_earning: 336,
    commission_percentage: 10,
    tax_percentage: 18,
    customer_paid_amount: 500,
    customer_pending_amount: 916,
    total_service_amount: 1200,
    paid_to_partner: 0,
    pending_to_partner: 1200,
    is_paid: false,
    cancellation_reasone: null,
    rating: 0,
    service_name: "Washing Machine Repair",
    category_name: "Home Services",
    deleted_at: null,
    created_at: "2026-04-22T14:00:00.000Z",
    updated_at: "2026-04-22T14:00:00.000Z",
  },
  {
    _id: "mock-op-3",
    order_id: "ord-1003",
    order_unique_id: "ORD-1003",
    user_id: "user-3",
    user_name: "Sanjay Kumar",
    partner_id: "partner-3",
    partner_name: "QuickFix Crew",
    category_id: "cat-3",
    service_status: 3,
    order_status: "completed",
    payment_mode_id: 1,
    service_id: "svc-3",
    service_date: "2026-04-24",
    service_from_time: "09:00",
    service_to_time: "10:00",
    sub_total: 700,
    tax: 126,
    user_paltform_fee: 0,
    partner_commison_platform_fee: 0,
    service_price: 700,
    total_price: 826,
    partner_earning: 620,
    admin_earning: 206,
    commission_percentage: 10,
    tax_percentage: 18,
    customer_paid_amount: 826,
    customer_pending_amount: 0,
    total_service_amount: 700,
    paid_to_partner: 700,
    pending_to_partner: 0,
    is_paid: true,
    cancellation_reasone: null,
    rating: 0,
    service_name: "Electrician Visit",
    category_name: "Electrical",
    deleted_at: null,
    created_at: "2026-04-24T09:00:00.000Z",
    updated_at: "2026-04-24T09:00:00.000Z",
  },
];

function applyMockFilters(
  rows: FinancialModel[],
  filters: FinancialListFilters
): FinancialModel[] {
  return rows.filter((r) => {
    if (filters.order_status) {
      const rowStatus =
        r.order_status?.trim().toLowerCase() ??
        (Number(r.service_status) === 3
          ? "completed"
          : Number(r.service_status) === 2
            ? "in_progress"
            : "");
      if (rowStatus !== filters.order_status) return false;
    }
    const customerSlug =
      r.customer_payment_status?.trim().toLowerCase() ??
      ((Number(r.customer_pending_amount) || 0) <= 0
        ? "paid"
        : (Number(r.customer_paid_amount) || 0) > 0
          ? "partially_paid"
          : "unpaid");
    const partnerSlug =
      r.partner_payment_status?.trim().toLowerCase() ??
      ((Number(r.pending_to_partner) || 0) <= 0
        ? "paid"
        : (Number(r.paid_to_partner) || 0) > 0
          ? "partially_paid"
          : "unpaid");
    if (
      filters.customer_payment_status &&
      customerSlug !== filters.customer_payment_status
    )
      return false;
    if (
      filters.partner_payment_status &&
      partnerSlug !== filters.partner_payment_status
    )
      return false;
    if (filters.from_date && (r.service_date ?? "") < filters.from_date)
      return false;
    if (filters.to_date && (r.service_date ?? "") > filters.to_date)
      return false;
    const searchQ = (filters.search ?? filters.keyword)?.trim();
    if (searchQ) {
      const k = searchQ.toLowerCase();
      const hay = [
        r.order_unique_id ?? "",
        r.user_name ?? "",
        r.partner_name ?? "",
        r.service_name ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(k)) return false;
    }
    return true;
  });
}

const ORDER_STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "completed", label: "Completed" },
  { value: "in_progress", label: "In progress" },
] as const;

function serviceLineOrderStatusLabel(row: FinancialModel): string {
  const slug = row.order_status?.trim().toLowerCase();
  if (slug === "completed") return "Completed";
  if (slug === "in_progress") return "In progress";
  if (Number(row.service_status) === 3) return "Completed";
  if (Number(row.service_status) === 2) return "In progress";
  return "—";
}

function buildListFilters(p: {
  search?: string;
  sort?: string;
  orderStatus: string;
  customerPaymentScope: string;
  partnerPaymentScope: string;
  fromDate: string;
  toDate: string;
  franchiseId?: string;
}): FinancialListFilters {
  const fid = franchiseIdForApiQuery(p.franchiseId);
  const out: FinancialListFilters = {
    ...(p.search ? { search: p.search } : {}),
    ...(p.sort ? { sort: p.sort } : {}),
    ...(p.orderStatus ? { order_status: p.orderStatus } : {}),
    ...(p.fromDate ? { from_date: p.fromDate } : {}),
    ...(p.toDate ? { to_date: p.toDate } : {}),
    ...(fid ? { franchise_id: fid } : {}),
  };
  if (p.customerPaymentScope) {
    out.customer_payment_status = p.customerPaymentScope;
  }
  if (p.partnerPaymentScope) {
    out.partner_payment_status = p.partnerPaymentScope;
  }
  return out;
}

const ORDER_PAYMENTS_STAT_CARD_STYLE: React.CSSProperties = {
  borderColor: "var(--lb-border)",
  cursor: "default",
  maxWidth: "100%",
  boxSizing: "border-box",
};

function formatInrGroupedAmount(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0;
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const OrderPayments = () => {
  const navigate = useNavigate();

  const {
    register: headerRegister,
    setValue: setHeaderValue,
    franchiseId: headerFranchiseId,
  } = useFranchiseHeaderForm();

  const [summary, setSummary] = useState<{
    completedOrders: number;
    inProgressOrders: number;
    totalPartnerPending: number;
    totalUserPending: number;
  }>({
    completedOrders: 0,
    inProgressOrders: 0,
    totalPartnerPending: 0,
    totalUserPending: 0,
  });
  const [financialList, setFinancialList] = useState<FinancialModel[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const fetchRef = useRef(false);

  const [orderStatus, setOrderStatus] = useState("");
  const [customerPaymentScope, setCustomerPaymentScope] = useState("");
  const [partnerPaymentScope, setPartnerPaymentScope] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filterEpoch, setFilterEpoch] = useState(0);
  const [utilitySearchKey, setUtilitySearchKey] = useState(0);
  const [appliedSearchKeyword, setAppliedSearchKeyword] = useState("");
  const [keywordActive, setKeywordActive] = useState(false);
  const [sortBy, setSortBy] = useState<ServerTableSortBy>([]);

  const listParamsRef = useRef<{
    search?: string;
    orderStatus: string;
    customerPaymentScope: string;
    partnerPaymentScope: string;
    fromDate: string;
    toDate: string;
  }>({
    orderStatus: "",
    customerPaymentScope: "",
    partnerPaymentScope: "",
    fromDate: "",
    toDate: "",
  });

  useEffect(() => {
    listParamsRef.current.orderStatus = orderStatus;
    listParamsRef.current.customerPaymentScope = customerPaymentScope;
    listParamsRef.current.partnerPaymentScope = partnerPaymentScope;
    listParamsRef.current.fromDate = fromDate;
    listParamsRef.current.toDate = toDate;
  }, [
    orderStatus,
    customerPaymentScope,
    partnerPaymentScope,
    fromDate,
    toDate,
  ]);

  const dateScopeFilters = useMemo((): FinancialListFilters => {
    const out: FinancialListFilters = {};
    if (fromDate) out.from_date = fromDate;
    if (toDate) out.to_date = toDate;
    const fid = franchiseIdForApiQuery(headerFranchiseId);
    if (fid) out.franchise_id = fid;
    return out;
  }, [fromDate, toDate, headerFranchiseId]);

  useEffect(() => {
    if (USE_MOCK_ORDER_PAYMENTS) {
      const scoped = applyMockFilters(
        MOCK_ORDER_PAYMENTS_ROWS,
        dateScopeFilters
      );
      let totalPartnerPending = 128000;
      let totalUserPending = 135000;
      for (const r of scoped) {
        totalPartnerPending += Number(r.pending_to_partner) || 0;
        totalUserPending += Number(r.customer_pending_amount) || 0;
      }
      setSummary({
        completedOrders: scoped.filter(
          (r) =>
            r.order_status === "completed" || Number(r.service_status) === 3
        ).length,
        inProgressOrders: scoped.filter(
          (r) =>
            r.order_status === "in_progress" || Number(r.service_status) === 2
        ).length,
        totalPartnerPending: Math.round(totalPartnerPending * 100) / 100,
        totalUserPending: Math.round(totalUserPending * 100) / 100,
      });
      return;
    }
    let cancelled = false;
    (async () => {
      const fid = franchiseIdForApiQuery(headerFranchiseId);
      const { responseCount, countModel } = await getCount(
        "financial-order-payments",
        {
          ...(fid ? { franchise_id: fid } : {}),
          ...(fromDate ? { from_date: fromDate } : {}),
          ...(toDate ? { to_date: toDate } : {}),
        }
      );
      if (cancelled) return;
      if (!responseCount || !countModel) return;
      setSummary({
        completedOrders: Number(countModel.total_completed_orders) || 0,
        inProgressOrders: Number(countModel.total_in_progress_orders) || 0,
        totalPartnerPending:
          Math.round(
            (Number(countModel.total_partner_pending_amount) || 0) * 100
          ) / 100,
        totalUserPending:
          Math.round(
            (Number(countModel.total_user_pending_amount) || 0) * 100
          ) / 100,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [dateScopeFilters, fromDate, toDate, headerFranchiseId]);

  const runFetch = useCallback(
    async (page: number, size: number) => {
      if (fetchRef.current) return;
      fetchRef.current = true;
      const p = listParamsRef.current;
      const merged = buildListFilters({
        search: p.search,
        orderStatus: p.orderStatus,
        customerPaymentScope: p.customerPaymentScope,
        partnerPaymentScope: p.partnerPaymentScope,
        fromDate: p.fromDate,
        toDate: p.toDate,
        franchiseId: headerFranchiseId,
      });
      if (USE_MOCK_ORDER_PAYMENTS) {
        const rows = applyMockFilters(MOCK_ORDER_PAYMENTS_ROWS, merged);
        const start = (page - 1) * size;
        const end = start + size;
        setFinancialList(rows.slice(start, end));
        setTotalPages(Math.max(1, Math.ceil(rows.length / size)));
        fetchRef.current = false;
        return;
      }
      const {
        response,
        financials,
        totalPages: tp,
      } = await fetchFinancial(page, size, merged, undefined, sortBy);
      if (response) {
        setFinancialList(financials);
        setTotalPages(tp);
      }
      fetchRef.current = false;
    },
    [sortBy, headerFranchiseId]
  );

  useEffect(() => {
    void runFetch(currentPage, pageSize);
  }, [currentPage, pageSize, filterEpoch, runFetch]);

  const bumpFilters = useCallback(() => {
    setCurrentPage(1);
    setFilterEpoch((e) => e + 1);
  }, []);

  const handleSearch = (value: string) => {
    listParamsRef.current.search = value;
    setKeywordActive(!!value.trim());
    setCurrentPage(1);
    setFilterEpoch((e) => e + 1);
  };
  const handleServerSortChange = useCallback(
    (next: { id: string; desc: boolean }[]) => {
      setSortBy(next);
      setCurrentPage(1);
      setFilterEpoch((e) => e + 1);
    },
    []
  );

  const filterControls = (
    <Row className="order-payments-filters-row g-3 mt-1 mb-2 align-items-end flex-nowrap">
      <Col xs="auto" className="order-payments-filter-col">
        <CustomFormSelect
          label="Order Status"
          controlId="Order status"
          register={headerRegister as unknown as UseFormRegister<any>}
          options={[...ORDER_STATUS_OPTIONS]}
          fieldName="order_status_filter"
          defaultValue={orderStatus}
          setValue={
            setHeaderValue as (
              name: string,
              value: any,
              options?: { shouldValidate?: boolean }
            ) => void
          }
          asCol={false}
          noBottomMargin
          onChange={(e) => {
            setOrderStatus(e.target.value);
            listParamsRef.current.orderStatus = e.target.value;
            bumpFilters();
          }}
        />
      </Col>

      <Col xs="auto" className="order-payments-filter-col">
        <CustomFormSelect
          label="Partner Payment Status"
          controlId="Partner payment status"
          register={headerRegister as unknown as UseFormRegister<any>}
          options={[...PARTNER_PAYMENT_STATUS_FILTER_OPTIONS]}
          fieldName="partner_payment_status_filter"
          defaultValue={partnerPaymentScope}
          setValue={
            setHeaderValue as (
              name: string,
              value: any,
              options?: { shouldValidate?: boolean }
            ) => void
          }
          asCol={false}
          noBottomMargin
          onChange={(e) => {
            setPartnerPaymentScope(e.target.value);
            listParamsRef.current.partnerPaymentScope = e.target.value;
            bumpFilters();
          }}
        />
      </Col>

      <Col xs="auto" className="order-payments-filter-col">
        <CustomFormSelect
          label="Customer Payment Status"
          controlId="Customer payment status"
          register={headerRegister as unknown as UseFormRegister<any>}
          options={[...CUSTOMER_PAYMENT_STATUS_FILTER_OPTIONS]}
          fieldName="customer_payment_status_filter"
          defaultValue={customerPaymentScope}
          setValue={
            setHeaderValue as (
              name: string,
              value: any,
              options?: { shouldValidate?: boolean }
            ) => void
          }
          asCol={false}
          noBottomMargin
          onChange={(e) => {
            setCustomerPaymentScope(e.target.value);
            listParamsRef.current.customerPaymentScope = e.target.value;
            bumpFilters();
          }}
        />
      </Col>

      <Col xs="auto" className="order-payments-filter-col">
        <Button
          variant="outline-secondary"
          size="sm"
          className="custom-btn-secondary partner-payout-clear-btn px-3"
          type="button"
          disabled={
            !orderStatus &&
            !customerPaymentScope &&
            !partnerPaymentScope &&
            !fromDate &&
            !toDate &&
            !keywordActive
          }
          onClick={() => {
            setOrderStatus("");
            setCustomerPaymentScope("");
            setPartnerPaymentScope("");
            setFromDate("");
            setToDate("");
            setKeywordActive(false);
            setAppliedSearchKeyword("");
            setSortBy([]);
            listParamsRef.current = {
              search: undefined,
              orderStatus: "",
              customerPaymentScope: "",
              partnerPaymentScope: "",
              fromDate: "",
              toDate: "",
            };
            setUtilitySearchKey((k) => k + 1);
            setCurrentPage(1);
            setFilterEpoch((e) => e + 1);
          }}
        >
          Clear
        </Button>
      </Col>
    </Row>
  );

  const financialColumns = React.useMemo(
    () => [
      {
        Header: "SR No",
        accessor: "serial_no",
        Cell: ({ row }: { row: { index: number } }) =>
          (currentPage - 1) * pageSize + row.index + 1,
      },
      {
        Header: "Order ID",
        accessor: "order_unique_id",
        Cell: textUnderlineCell("order_unique_id", (row) => {
          showOrderInfoDialog(row.order_id, () => {});
        }),
      },
      {
        Header: "User Name",
        accessor: "user_name",
        sort: true,
        Cell: ({ row }: { row: { original: FinancialModel } }) => {
          const label = row.original.user_name?.trim() || "-";
          return (
            <span
              style={{
                textDecoration: "underline",
                textDecorationThickness: "1px",
                cursor: "pointer",
              }}
              onClick={() => {
                const id = row.original.user_id;
                if (id) showUserDetailsDialog(id, () => {});
              }}
            >
              {label}
            </span>
          );
        },
      },
      {
        Header: "Partner Name",
        accessor: "partner_name",
        sort: true,
        Cell: ({ row }: { row: { original: FinancialModel } }) => {
          const label = row.original.partner_name?.trim() || "-";
          return (
            <span
              style={{
                textDecoration: "underline",
                textDecorationThickness: "1px",
                cursor: "pointer",
              }}
              onClick={() =>
                navigate(
                  `${ROUTES.PARTNER_PAYOUT_SHOW.path}?id=${row.original.partner_id}`
                )
              }
            >
              {label}
            </span>
          );
        },
      },
      { Header: "Service Name", accessor: "service_name", sort: true },
      {
        Header: "Service Date",
        accessor: "service_date",
        sort: true,
        Cell: ({ row }: { row: { original: FinancialModel } }) =>
          formatDate(
            row.original.service_date ? row.original.service_date : ""
          ),
      },
      {
        Header: "Total Amount",
        accessor: "total_price",
        sort: true,
        Cell: priceCell("total_price"),
      },
      {
        Header: "Commission (%)",
        accessor: "commission_percentage",
        Cell: ({ row }: { row: { original: FinancialModel } }) => {
          const v =
            row.original.commission_percentage ??
            row.original.commission_percent;
          return v != null ? `${v}%` : "-";
        },
      },
      {
        Header: "Tax (%)",
        accessor: "tax_percentage",
        Cell: ({ row }: { row: { original: FinancialModel } }) => {
          const v = row.original.tax_percentage ?? row.original.tax_percent;
          return v != null ? `${v}%` : "-";
        },
      },
      {
        Header: "Customer Paid Amount",
        accessor: "customer_paid_amount",
        Cell: ({ row }: { row: { original: FinancialModel } }) => {
          const o = row.original;
          const v =
            o.customer_paid_amount ?? (o.is_paid ? o.total_price : undefined);
          return (
            <span>
              {v !== undefined && v !== null
                ? `${AppConstant.currencySymbol}${v}`
                : "-"}
            </span>
          );
        },
      },
      {
        Header: "Customer Pending Amount",
        accessor: "customer_pending_amount",
        Cell: ({ row }: { row: { original: FinancialModel } }) => {
          const o = row.original;
          const v =
            o.customer_pending_amount ??
            (!o.is_paid ? o.total_price : undefined);
          return (
            <span>
              {v !== undefined && v !== null
                ? `${AppConstant.currencySymbol}${v}`
                : "-"}
            </span>
          );
        },
      },
      {
        Header: "Total Partner Amount",
        accessor: "total_service_amount",
        Cell: ({ row }: { row: { original: FinancialModel } }) => {
          const v =
            row.original.total_service_amount ?? row.original.service_price;
          return (
            <span>
              {v !== undefined && v !== null
                ? `${AppConstant.currencySymbol}${v}`
                : "-"}
            </span>
          );
        },
      },
      {
        Header: "Paid to Partner",
        accessor: "paid_to_partner",
        Cell: priceCell("paid_to_partner"),
      },
      {
        Header: "Pending to Partner",
        accessor: "pending_to_partner",
        Cell: priceCell("pending_to_partner"),
      },
      {
        Header: "Customer Payment Status",
        accessor: "customer_payment_status",
        Cell: ({ row }: { row: { original: FinancialModel } }) => {
          const slug = row.original.customer_payment_status?.trim();
          if (slug) {
            const label = customerPaymentStatusLabelFromSlug(slug);
            if (label) return label;
          }
          const pending = Number(row.original.customer_pending_amount) || 0;
          const paid = Number(row.original.customer_paid_amount) || 0;
          if (pending <= 0 && paid > 0) return "Paid";
          if (paid > 0 && pending > 0) return "Partially paid";
          return "Unpaid";
        },
      },
      {
        Header: "Partner Payment Status",
        accessor: "partner_payment_status",
        Cell: ({ row }: { row: { original: FinancialModel } }) => {
          const slug = row.original.partner_payment_status?.trim();
          if (slug) {
            const label = partnerPaymentStatusLabelFromSlug(slug);
            if (label) return label;
          }
          const pending = Number(row.original.pending_to_partner) || 0;
          const paid = Number(row.original.paid_to_partner) || 0;
          if (pending <= 0 && paid > 0) return "Paid";
          if (paid > 0 && pending > 0) return "Partially paid";
          return "Unpaid";
        },
      },
      {
        Header: "Order status",
        accessor: "order_status",
        Cell: ({ row }: { row: { original: FinancialModel } }) =>
          serviceLineOrderStatusLabel(row.original),
      },
    ],
    [currentPage, pageSize, navigate]
  );

  return (
    <div className="main-page-content">
      <CustomHeader
        title="Financial — Order Payments"
        titlePrefix={<FinancialSubPageBackButton />}
        register={headerRegister as unknown as UseFormRegister<any>}
        setValue={setHeaderValue as (name: string, value: any) => void}
      />

      <div className="row g-2">
        <div className="col-md-3">
          <div
            className="custom-box-count"
            style={ORDER_PAYMENTS_STAT_CARD_STYLE}
          >
            <div className="box-rw-clr2" style={{ textDecoration: "none" }}>
              Total completed orders
            </div>
            <span className="custom-box-count-span mt-2">
              {summary.completedOrders}
            </span>
          </div>
        </div>

        <div className="col-md-3">
          <div
            className="custom-box-count"
            style={ORDER_PAYMENTS_STAT_CARD_STYLE}
          >
            <div className="box-rw-clr3" style={{ textDecoration: "none" }}>
              Total in progress orders
            </div>
            <span className="custom-box-count-span mt-2">
              {summary.inProgressOrders}
            </span>
          </div>
        </div>

        <div className="col-md-3">
          <div
            className="custom-box-count"
            style={{ ...ORDER_PAYMENTS_STAT_CARD_STYLE, pointerEvents: "none" }}
            role="status"
            aria-label={`Total partner pending amount ${
              AppConstant.currencySymbol
            }${formatInrGroupedAmount(summary.totalPartnerPending)}`}
          >
            <div className="box-rw-clr4" style={{ textDecoration: "none" }}>
              Total partner pending amount
            </div>
            <span className="custom-box-count-span mt-2 d-inline-flex align-items-baseline gap-1">
              <span aria-hidden="true">{AppConstant.currencySymbol}</span>
              <span>{formatInrGroupedAmount(summary.totalPartnerPending)}</span>
            </span>
          </div>
        </div>

        <div className="col-md-3">
          <div
            className="custom-box-count"
            style={{ ...ORDER_PAYMENTS_STAT_CARD_STYLE, pointerEvents: "none" }}
            role="status"
            aria-label={`Total user pending amount ${
              AppConstant.currencySymbol
            }${formatInrGroupedAmount(summary.totalUserPending)}`}
          >
            <div className="box-rw-clr1" style={{ textDecoration: "none" }}>
              Total user pending amount
            </div>
            <span className="custom-box-count-span mt-2 d-inline-flex align-items-baseline gap-1">
              <span aria-hidden="true">{AppConstant.currencySymbol}</span>
              <span>{formatInrGroupedAmount(summary.totalUserPending)}</span>
            </span>
          </div>
        </div>
      </div>

      <CustomUtilityBox
        key={utilitySearchKey}
        searchOnlyToolbar
        title="Order Payments"
        searchHint="Order ID, user name, partner name, service name…"
        controlSlot={
          <>
            <div style={{ minWidth: "220px" }}>
              <Form.Label className="mb-1 fw-medium">From Date</Form.Label>
              <CustomDatePicker
                label=""
                controlId="from_date_filter"
                selectedDate={fromDate || null}
                onChange={(e) => {
                  const value = e ? e.toISOString().slice(0, 10) : "";
                  setFromDate(value);
                  listParamsRef.current.fromDate = value;
                  bumpFilters();
                }}
                register={headerRegister as unknown as UseFormRegister<any>}
                setValue={
                  setHeaderValue as (
                    name: string,
                    value: any,
                    options?: { shouldValidate?: boolean }
                  ) => void
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
                controlId="to_date_filter"
                selectedDate={toDate || null}
                onChange={(e) => {
                  const value = e ? e.toISOString().slice(0, 10) : "";
                  setToDate(value);
                  listParamsRef.current.toDate = value;
                  bumpFilters();
                }}
                register={headerRegister as unknown as UseFormRegister<any>}
                setValue={
                  setHeaderValue as (
                    name: string,
                    value: any,
                    options?: { shouldValidate?: boolean }
                  ) => void
                }
                asCol={false}
                groupClassName="mb-0 w-100"
                placeholderText="To Date"
                filterDate={() => true}
              />
            </div>
          </>
        }
        toolsInlineRow
        onSearch={(value) => handleSearch(value)}
        syncKeyword={appliedSearchKeyword}
      />

      {filterControls}

      <CustomTable
        columns={financialColumns}
        data={financialList}
        pageSize={pageSize}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(page: number) => setCurrentPage(page)}
        onLimitChange={(ps: number) => {
          setPageSize(ps);
          setCurrentPage(1);
        }}
        manualSortBy
        sortBy={sortBy}
        onSortChange={handleServerSortChange}
        theadClass="table-light"
      />
    </div>
  );
};

export default OrderPayments;
