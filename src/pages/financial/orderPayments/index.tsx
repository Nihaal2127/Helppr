import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Col, Form, Row } from "react-bootstrap";
import { useForm, UseFormRegister } from "react-hook-form";
import CustomHeader from "../../../components/CustomHeader";
import { FinancialSubPageBackButton } from "../../../components/FinancialSubPageNav";
import CustomUtilityBox from "../../../components/CustomUtilityBox";
import CustomFormSelect from "../../../components/CustomFormSelect";
import CustomDatePicker from "../../../components/CustomDatePicker";
import { formatDate, priceCell, textUnderlineCell } from "../../../helper/utility";
import { AppConstant } from "../../../constant/AppConstant";
import CustomTable from "../../../components/CustomTable";
import {
  enrichFinancialRowsWithOrderNames,
  fetchFinancial,
  FinancialListFilters,
} from "../../../services/financialService";
import { FinancialModel } from "../../../models/FinancialModel";
import OrderInfoDialog from "../../orderManagement/OrderInfoDialog";
import UserDetailsDialog from "../../userManagement/UserDetailsDialog";
import { ROUTES } from "../../../routes/Routes";

const ORDER_STATUS_OPTIONS = [
  { value: "", label: "All order statuses" },
  { value: "3", label: "Completed" },
  { value: "2", label: "In progress" },
] as const;

const PARTNER_PAYMENT_STATUS_OPTIONS = [
  { value: "", label: "All partner payment statuses" },
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
  { value: "partially_paid", label: "Partially paid" },
] as const;

const CUSTOMER_PAYMENT_STATUS_OPTIONS = [
  { value: "", label: "All customer payment statuses" },
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
  { value: "partially_paid", label: "Partially paid" },
  { value: "refunded", label: "Refunded" },
  { value: "partially_refunded", label: "Partially refunded" },
] as const;

function serviceLineOrderStatusLabel(serviceStatus: number): string {
  if (serviceStatus === 3) return "Completed";
  if (serviceStatus === 2) return "In progress";
  if (!serviceStatus) return "—";
  return String(serviceStatus);
}

function buildListFilters(p: {
  keyword?: string;
  sort?: string;
  orderStatus: string;
  customerPaymentScope: string;
  partnerPaymentScope: string;
  fromDate: string;
  toDate: string;
}): FinancialListFilters {
  const out: FinancialListFilters = {
    ...(p.keyword ? { keyword: p.keyword } : {}),
    ...(p.sort ? { sort: p.sort } : {}),
    ...(p.orderStatus ? { service_status: p.orderStatus } : {}),
    ...(p.fromDate ? { from_date: p.fromDate } : {}),
    ...(p.toDate ? { to_date: p.toDate } : {}),
  };
  if (p.customerPaymentScope) {
    out.customer_payment_status = p.customerPaymentScope;
  }
  if (p.partnerPaymentScope) {
    out.partner_payment_status = p.partnerPaymentScope;
  }
  return out;
}

const OrderPayments = () => {
  const navigate = useNavigate();

  const { register: headerRegister, setValue: setHeaderValue } = useForm<{ franchise_id: string }>({
    defaultValues: { franchise_id: "all" },
  });

  const [summary, setSummary] = useState<{ completedOrders: number; inProgressOrders: number }>({
    completedOrders: 0,
    inProgressOrders: 0,
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
  const [keywordActive, setKeywordActive] = useState(false);

  const listParamsRef = useRef<{
    keyword?: string;
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
  }, [orderStatus, customerPaymentScope, partnerPaymentScope, fromDate, toDate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [completedRes, inProgRes] = await Promise.all([
        fetchFinancial(1, 1, { service_status: "3" }, { skipLoader: true }),
        fetchFinancial(1, 1, { service_status: "2" }, { skipLoader: true }),
      ]);
      if (cancelled) return;
      setSummary({
        completedOrders: completedRes.response ? (completedRes.totalItems ?? 0) : 0,
        inProgressOrders: inProgRes.response ? (inProgRes.totalItems ?? 0) : 0,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const runFetch = useCallback(async (page: number, size: number) => {
    if (fetchRef.current) return;
    fetchRef.current = true;
    const p = listParamsRef.current;
    const merged = buildListFilters({
      keyword: p.keyword,
      orderStatus: p.orderStatus,
      customerPaymentScope: p.customerPaymentScope,
      partnerPaymentScope: p.partnerPaymentScope,
      fromDate: p.fromDate,
      toDate: p.toDate,
    });
    const { response, financials, totalPages: tp } = await fetchFinancial(page, size, merged);
    if (response) {
      const withNames = await enrichFinancialRowsWithOrderNames(financials);
      setFinancialList(withNames);
      setTotalPages(tp);
    }
    fetchRef.current = false;
  }, []);

  useEffect(() => {
    void runFetch(currentPage, pageSize);
  }, [currentPage, pageSize, filterEpoch, runFetch]);

  const bumpFilters = () => {
    setCurrentPage(1);
    setFilterEpoch((e) => e + 1);
  };

  const handleSearch = (value: string) => {
    listParamsRef.current.keyword = value;
    setKeywordActive(!!value.trim());
    setCurrentPage(1);
    setFilterEpoch((e) => e + 1);
  };

  const filterControls = (
    <Row className="order-payments-filters-row g-2 mt-1 mb-2 align-items-end flex-nowrap">
      <Col xs="auto" className="order-payments-filter-col">
        <CustomFormSelect
          label="Order Status"
          controlId="Order status"
          register={headerRegister as unknown as UseFormRegister<any>}
          options={[...ORDER_STATUS_OPTIONS]}
          fieldName="order_status_filter"
          defaultValue={orderStatus}
          setValue={setHeaderValue as (name: string, value: any, options?: { shouldValidate?: boolean }) => void}
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
          options={[...PARTNER_PAYMENT_STATUS_OPTIONS]}
          fieldName="partner_payment_status_filter"
          defaultValue={partnerPaymentScope}
          setValue={setHeaderValue as (name: string, value: any, options?: { shouldValidate?: boolean }) => void}
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
          options={[...CUSTOMER_PAYMENT_STATUS_OPTIONS]}
          fieldName="customer_payment_status_filter"
          defaultValue={customerPaymentScope}
          setValue={setHeaderValue as (name: string, value: any, options?: { shouldValidate?: boolean }) => void}
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
            listParamsRef.current = {
              keyword: undefined,
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
        Cell: ({ row }: { row: { index: number } }) => (currentPage - 1) * pageSize + row.index + 1,
      },
      {
        Header: "Order ID",
        accessor: "order_unique_id",
        Cell: textUnderlineCell("order_unique_id", (row) => {
          OrderInfoDialog.show(row.order_id, () => {});
        }),
      },
      {
        Header: "User Name",
        accessor: "user_name",
        Cell: ({ row }: { row: { original: FinancialModel } }) => {
          const label = row.original.user_info?.name || "-";
          return (
            <span
              style={{
                textDecoration: "underline",
                textDecorationThickness: "1px",
                cursor: "pointer",
              }}
              onClick={() => {
                const id = row.original.user_id;
                if (id) UserDetailsDialog.show(id, () => {});
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
        Cell: ({ row }: { row: { original: FinancialModel } }) => {
          const label = row.original.partner_info?.name ?? "-";
          return (
            <span
              style={{
                textDecoration: "underline",
                textDecorationThickness: "1px",
                cursor: "pointer",
              }}
              onClick={() => navigate(`${ROUTES.PARTNER_PAYOUT_SHOW.path}?id=${row.original.partner_id}`)}
            >
              {label}
            </span>
          );
        },
      },
      { Header: "Service Name", accessor: "service_name" },
      {
        Header: "Service Date",
        accessor: "service_date",
        Cell: ({ row }: { row: { original: FinancialModel } }) =>
          formatDate(row.original.service_date ? row.original.service_date : ""),
      },
      {
        Header: "Total Price",
        accessor: "total_price",
        Cell: priceCell("total_price"),
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
        Header: "Commission (%)",
        accessor: "commission_percentage",
        Cell: ({ row }: { row: { original: FinancialModel } }) => {
          const v = row.original.commission_percentage ?? row.original.commission_percent;
          return v != null ? `${v}%` : "-";
        },
      },
      {
        Header: "Customer Paid Amount",
        accessor: "customer_paid_amount",
        Cell: ({ row }: { row: { original: FinancialModel } }) => {
          const o = row.original;
          const v = o.customer_paid_amount ?? (o.is_paid ? o.total_price : undefined);
          return <span>{v !== undefined && v !== null ? `${AppConstant.currencySymbol}${v}` : "-"}</span>;
        },
      },
      {
        Header: "Customer Pending Amount",
        accessor: "customer_pending_amount",
        Cell: ({ row }: { row: { original: FinancialModel } }) => {
          const o = row.original;
          const v = o.customer_pending_amount ?? (!o.is_paid ? o.total_price : undefined);
          return <span>{v !== undefined && v !== null ? `${AppConstant.currencySymbol}${v}` : "-"}</span>;
        },
      },
      {
        Header: "Total Service Amount",
        accessor: "total_service_amount",
        Cell: ({ row }: { row: { original: FinancialModel } }) => {
          const v = row.original.total_service_amount ?? row.original.service_price;
          return <span>{v !== undefined && v !== null ? `${AppConstant.currencySymbol}${v}` : "-"}</span>;
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
        Header: "Order status",
        accessor: "service_status",
        Cell: ({ row }: { row: { original: FinancialModel } }) =>
          serviceLineOrderStatusLabel(row.original.service_status),
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

      <div className="d-flex flex-wrap gap-5">
        <div
          className="custom-box-count"
          style={{
            borderColor: "var(--lb-border)",
            cursor: "default",
            width: "18rem",
            maxWidth: "100%",
            flex: "0 0 auto",
            boxSizing: "border-box",
          }}
        >
          <div className="box-rw-clr2" style={{ textDecoration: "none" }}>
            Total completed orders
          </div>
          <span className="custom-box-count-span mt-2">{summary.completedOrders}</span>
        </div>

        <div
          className="custom-box-count"
          style={{
            borderColor: "var(--lb-border)",
            cursor: "default",
            width: "18rem",
            maxWidth: "100%",
            flex: "0 0 auto",
            boxSizing: "border-box",
          }}
        >
          <div className="box-rw-clr3" style={{ textDecoration: "none" }}>
            Total in progress orders
          </div>
          <span className="custom-box-count-span mt-2">{summary.inProgressOrders}</span>
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
                setValue={setHeaderValue as (name: string, value: any, options?: { shouldValidate?: boolean }) => void}
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
                setValue={setHeaderValue as (name: string, value: any, options?: { shouldValidate?: boolean }) => void}
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
        theadClass="table-light"
      />
    </div>
  );
};

export default OrderPayments;