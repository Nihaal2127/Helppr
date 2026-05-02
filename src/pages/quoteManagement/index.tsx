import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { showSuccessAlert } from "../../helper/alertHelper";
import { openConfirmDialog } from "../../components/CustomConfirmDialog";
import {
  fetchQuoteCreateOptions,
  fetchQuotes,
  getQuoteServiceOptionsForCategory,
  getQuoteServiceScheduleMode,
  normalizeQuoteListSort,
  QuoteListSort,
} from "../../services/quoteService";
import type { OptionType, QuoteUserOption } from "../../services/quoteService";
import { formatQuoteScheduleForTable } from "./quoteScheduleDisplay";

/** Time-only value for `CustomTimePicker` / stored fields (same pattern as quote schedule edit). */
const toTimeStorageFromDate = (date: Date | null): string =>
  date
    ? `2000-01-01T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:00`
    : "";

const timeStorageOrNull = (v: string | undefined | null): string | null =>
  v && String(v).trim() ? v : null;

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

const toQuoteViewData = (row: QuoteRow): QuoteViewData => ({
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
  const { register: quoteFilterRegister, setValue: setQuoteFilterValue } = useForm<{
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
  const scheduleMode = useMemo(
    () => getQuoteServiceScheduleMode(addQuote.requested_services),
    [addQuote.requested_services]
  );
  const quoteServiceOptionsForCategory = useMemo(
    () => getQuoteServiceOptionsForCategory(addQuote.category_id),
    [addQuote.category_id]
  );
  const [quotePartnerOptions, setQuotePartnerOptions] = useState<OptionType[]>([]);
  const [quoteUserOptions, setQuoteUserOptions] = useState<QuoteUserOption[]>([]);
  const [quoteEmployeeOptions, setQuoteEmployeeOptions] = useState<OptionType[]>([]);
  const [quoteCategoryOptions, setQuoteCategoryOptions] = useState<OptionType[]>([]);
  const userSelectOptions = useMemo<OptionType[]>(
    () => quoteUserOptions.map((u) => ({ value: u.value, label: u.label })),
    [quoteUserOptions]
  );

  const [quoteRows, setQuoteRows] = useState<QuoteRow[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [quoteCountsByTab, setQuoteCountsByTab] = useState<Partial<Record<QuoteTabKey, number>>>({});
  const [sortBy, setSortBy] = useState<QuoteListSort>([]);

  const fetchRef = useRef(false);

  const quoteListFilters = useMemo(
    () => ({
      keyword: searchKeyword,
      from_date: fromDate,
      to_date: toDate,
    }),
    [searchKeyword, fromDate, toDate]
  );

  const fetchData = useCallback(async () => {
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
        setQuoteCountsByTab((prev) => ({ ...prev, [selectedTab]: res.totalCount }));
      } else {
        setQuoteRows([]);
        setTotalPages(0);
        setQuoteCountsByTab((prev) => ({ ...prev, [selectedTab]: 0 }));
      }
    } finally {
      fetchRef.current = false;
    }
  }, [currentPage, pageSize, quoteListFilters, selectedTab, sortBy]);

  const handleServerSortChange = useCallback((next: { id: string; desc: boolean }[]) => {
    setSortBy(normalizeQuoteListSort(next as QuoteListSort));
    setCurrentPage(1);
  }, []);

  // Keep create-modal dropdown options in sync with the mock "API".
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        quotePartnerOptions: partners,
        quoteUserOptions: users,
        quoteEmployeeOptions: employees,
        quoteCategoryOptions: categories,
      } = await fetchQuoteCreateOptions();
      if (cancelled) return;
      setQuotePartnerOptions(partners);
      setQuoteUserOptions(users);
      setQuoteEmployeeOptions(employees);
      setQuoteCategoryOptions(categories);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        quoteTabs.map(({ key }) => fetchQuotes(key, 1, 1, quoteListFilters, []))
      );
      if (cancelled) return;
      const next: Partial<Record<QuoteTabKey, number>> = {};
      quoteTabs.forEach(({ key }, i) => {
        const res = results[i];
        next[key] = res.response ? res.totalCount : 0;
      });
      setQuoteCountsByTab(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [quoteListFilters]);

  const handleTabClick = (tabKey: QuoteTabKey) => {
    setSelectedTab(tabKey);
    setCurrentPage(1);
    setSortBy([]);
  };

  const handleVoidQuote = useCallback((quote: QuoteRow) => {
    openConfirmDialog(
      `Are you sure you want to void this quote (${quote.quote_id})?`,
      "Void",
      "Cancel",
      () => {
        showSuccessAlert("Quote voided (UI only)");
      }
    );
  }, []);

  const handleQuoteView = useCallback(
    (row: QuoteRow) => {
      void import("./QuoteInfoDialog").then(({ default: QuoteInfoDialog }) => {
        QuoteInfoDialog.show(toQuoteViewData(row), () => {
          void fetchData();
        });
      });
    },
    [fetchData]
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
      selectedTab === "success" || selectedTab === "accepted" ? "scheduled_date" : "requested_date";

    const cols: any[] = [
      {
        Header: "SR No",
        accessor: "serial_no",
        Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
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
        accessor: selectedTab === "success" ? "partner_name" : "requested_partner",
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
    if (showAddQuote) {
      resetAddQuote({
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
    }
  }, [showAddQuote, resetAddQuote]);

  const onSubmitAddQuote = (_data: AddQuoteFormValues) => {
    setShowAddQuote(false);
    showSuccessAlert("Quote created (UI only)");
  };

  return (
    <div className="main-page-content">
      <CustomHeader
        title="Quote Management"
        rightActions={
          <button className="custom-btn-secondary w-auto" onClick={() => setShowAddQuote(true)}>
            Create Quote
          </button>
        }
        register={register}
        setValue={setValue}
      />

      <div className="d-flex mt-4 gap-2">
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
                register={quoteFilterRegister as unknown as UseFormRegister<any>}
                setValue={setQuoteFilterValue as (name: string, value: any) => void}
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
                register={quoteFilterRegister as unknown as UseFormRegister<any>}
                setValue={setQuoteFilterValue as (name: string, value: any) => void}
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
          <form noValidate onSubmit={handleAddQuoteSubmit(onSubmitAddQuote)}>
            <section className="custom-other-details" style={{ padding: "10px" }}>
              <Row>
                <Col xs={12} md={6} className="mt-2">
                  <CustomTextFieldSelect
                    label="User Name"
                    controlId="add-quote-user"
                    asCol={false}
                    options={userSelectOptions}
                    register={addQuoteRegister as unknown as UseFormRegister<any>}
                    fieldName="user_id"
                    error={addQuoteErrors.user_id}
                    requiredMessage="Please select a user"
                    defaultValue={addQuote.user_id}
                    setValue={setAddQuoteValue as (name: string, value: any) => void}
                    placeholder="Search user"
                    menuPortal
                    onChange={(e) => {
                      const uid = String(e.target.value || "");
                      const row = quoteUserOptions.find((u) => u.value === uid);
                      setAddQuoteValue("user_name", row?.user_name ?? "", { shouldValidate: true });
                    }}
                  />
                </Col>
                <Col xs={12} md={6} className="mt-2">
                  <CustomTextFieldSelect
                    label="Category"
                    controlId="add-quote-category"
                    asCol={false}
                    options={quoteCategoryOptions}
                    register={addQuoteRegister as unknown as UseFormRegister<any>}
                    fieldName="category_id"
                    error={addQuoteErrors.category_id}
                    requiredMessage="Please select a category"
                    defaultValue={addQuote.category_id}
                    setValue={(name: string, value: any) => {
                      setAddQuoteValue(name as keyof AddQuoteFormValues, value, { shouldValidate: true });
                      if (name === "category_id") {
                        setAddQuoteValue("requested_services", "", { shouldValidate: false });
                        setAddQuoteValue("requested_date", "", { shouldValidate: false });
                        setAddQuoteValue("requested_date_to", "", { shouldValidate: false });
                        setAddQuoteValue("requested_time", "", { shouldValidate: false });
                        setAddQuoteValue("requested_time_from", "", { shouldValidate: false });
                        setAddQuoteValue("requested_time_to", "", { shouldValidate: false });
                      }
                    }}
                    placeholder="Select category"
                    menuPortal
                  />
                </Col>
                <Col xs={12} md={6} className="mt-2">
                  <CustomTextFieldSelect
                    key={`add-quote-svc-${addQuote.category_id || "none"}`}
                    label="Requested Services"
                    controlId="add-quote-service"
                    asCol={false}
                    options={quoteServiceOptionsForCategory}
                    register={addQuoteRegister as unknown as UseFormRegister<any>}
                    fieldName="requested_services"
                    error={addQuoteErrors.requested_services}
                    requiredMessage={
                      addQuote.category_id ? "Please select a service" : undefined
                    }
                    defaultValue={addQuote.requested_services}
                    setValue={(name: string, value: any) => {
                      setAddQuoteValue(name as keyof AddQuoteFormValues, value, { shouldValidate: true });
                      if (name === "requested_services") {
                        setAddQuoteValue("requested_date", "", { shouldValidate: false });
                        setAddQuoteValue("requested_date_to", "", { shouldValidate: false });
                        setAddQuoteValue("requested_time", "", { shouldValidate: false });
                        setAddQuoteValue("requested_time_from", "", { shouldValidate: false });
                        setAddQuoteValue("requested_time_to", "", { shouldValidate: false });
                      }
                    }}
                    placeholder={
                      addQuote.category_id ? "Select service" : "Select category first"
                    }
                    menuPortal
                  />
                </Col>
                <Col xs={12} md={6} className="mt-2">
                  <CustomTextFieldSelect
                    label="Requested Partner"
                    controlId="add-quote-partner"
                    asCol={false}
                    options={quotePartnerOptions}
                    register={addQuoteRegister as unknown as UseFormRegister<any>}
                    fieldName="requested_partner"
                    error={addQuoteErrors.requested_partner}
                    defaultValue={addQuote.requested_partner}
                    setValue={setAddQuoteValue as (name: string, value: any) => void}
                    placeholder="Select partner"
                    menuPortal
                  />
                </Col>
                <Col xs={12} md={6} className="mt-2">
                  <CustomTextFieldSelect
                    label="Employee"
                    controlId="add-quote-employee"
                    asCol={false}
                    options={quoteEmployeeOptions}
                    register={addQuoteRegister as unknown as UseFormRegister<any>}
                    fieldName="employee_id"
                    error={addQuoteErrors.employee_id}
                    defaultValue={addQuote.employee_id}
                    setValue={setAddQuoteValue as (name: string, value: any) => void}
                    placeholder="Select employee"
                    menuPortal
                  />
                </Col>
                
                <Col xs={12} md={6} className="mt-2">
                  <CustomTextField
                    label="Service Price"
                    controlId="service_price"
                    placeholder="Enter price"
                    register={addQuoteRegister}
                    error={addQuoteErrors.service_price}
                    asCol={false}
                    inputType="text"
                  />
                </Col>
              </Row>

              <Row className="mt-3 mb-2">
                <Col xs={12}>
                  <label style={{ fontSize: "17px", fontWeight: "600", color: "var(--primary-color)" }} className="d-block mb-1">Schedule date and time</label>
                  <div className="small text-muted">
                    {scheduleMode === "single" && ""}
                    {scheduleMode === "range" && ""}
                    {scheduleMode === "hourly" && ""}
                  </div>
                </Col>
              </Row>

              <Row className="g-2">
                <Col xs={12} md={4} className="mt-2">
                  <CustomTextFieldDatePicket
                    label="From date"
                    controlId="requested_date"
                    selectedDate={addQuote.requested_date || null}
                    onChange={(date) => {
                      const next = toIsoCalendarDate(date) ?? "";
                      setAddQuoteValue("requested_date", next, { shouldValidate: true });
                    }}
                    register={addQuoteRegister as unknown as UseFormRegister<any>}
                    setValue={setAddQuoteValue as (name: string, value: any) => void}
                    asCol={false}
                    labelSize={12}
                    placeholderText="From date"
                    filterDate={() => true}
                  />
                </Col>
                <Col xs={12} md={4} className="mt-2">
                  <CustomTextFieldDatePicket
                    label="To date"
                    controlId="requested_date_to"
                    selectedDate={addQuote.requested_date_to || null}
                    onChange={(date) => {
                      const next = toIsoCalendarDate(date) ?? "";
                      setAddQuoteValue("requested_date_to", next, { shouldValidate: true });
                    }}
                    register={addQuoteRegister as unknown as UseFormRegister<any>}
                    setValue={setAddQuoteValue as (name: string, value: any) => void}
                    asCol={false}
                    labelSize={12}
                    placeholderText="To date"
                    filterDate={() => true}
                  />
                </Col>
                <Col xs={12} md={4} className="mt-2">
                  <CustomTextFieldTimePicket
                    label={scheduleMode === "range" ? "Time (optional)" : "Time"}
                    controlId="requested_time"
                    selectedTime={timeStorageOrNull(addQuote.requested_time)}
                    onChange={(date) =>
                      setAddQuoteValue("requested_time", toTimeStorageFromDate(date), {
                        shouldValidate: true,
                      })
                    }
                    placeholderText="Select time"
                    error={scheduleMode === "single" ? addQuoteErrors.requested_time : undefined}
                    register={addQuoteRegister}
                    validation={scheduleMode === "single" ? { required: "Time is required" } : undefined}
                    setValue={setAddQuoteValue}
                    asCol={false}
                    labelSize={12}
                    filterTime={(time) => {
                      const hour = time.getHours();
                      return hour >= 8 && hour <= 23;
                    }}
                  />
                </Col>
              </Row>

              <Row className="g-2">
                <Col xs={12} md={4} className="mt-2">
                  <CustomTextFieldDatePicket
                    label="Date"
                    controlId="requested_date"
                    groupControlId="add-quote-requested-date-fmt-b"
                    selectedDate={addQuote.requested_date || null}
                    onChange={(date) => {
                      const next = toIsoCalendarDate(date) ?? "";
                      setAddQuoteValue("requested_date", next, { shouldValidate: true });
                    }}
                    register={addQuoteRegister as unknown as UseFormRegister<any>}
                    setValue={setAddQuoteValue as (name: string, value: any) => void}
                    asCol={false}
                    labelSize={12}
                    placeholderText="Select date"
                    filterDate={() => true}
                    suppressHiddenRegister
                  />
                </Col>
                <Col xs={12} md={4} className="mt-2">
                  <CustomTextFieldTimePicket
                    label="From time"
                    controlId="requested_time_from"
                    groupControlId="add-quote-time-from-fmt-b"
                    selectedTime={timeStorageOrNull(addQuote.requested_time_from)}
                    onChange={(date) =>
                      setAddQuoteValue("requested_time_from", toTimeStorageFromDate(date), {
                        shouldValidate: true,
                      })
                    }
                    placeholderText="Select start time"
                    error={scheduleMode === "hourly" ? addQuoteErrors.requested_time_from : undefined}
                    register={addQuoteRegister}
                    validation={
                      scheduleMode === "hourly" ? { required: "Start time is required" } : undefined
                    }
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
                    label="To time"
                    controlId="requested_time_to"
                    groupControlId="add-quote-time-to-fmt-b"
                    selectedTime={timeStorageOrNull(addQuote.requested_time_to)}
                    onChange={(date) =>
                      setAddQuoteValue("requested_time_to", toTimeStorageFromDate(date), {
                        shouldValidate: true,
                      })
                    }
                    placeholderText="Select end time"
                    error={scheduleMode === "hourly" ? addQuoteErrors.requested_time_to : undefined}
                    register={addQuoteRegister}
                    validation={
                      scheduleMode === "hourly" ? { required: "End time is required" } : undefined
                    }
                    setValue={setAddQuoteValue}
                    asCol={false}
                    labelSize={12}
                    filterTime={(time) => {
                      const hour = time.getHours();
                      return hour >= 8 && hour <= 23;
                    }}
                  />
                </Col>
              </Row>
            </section>
          </form>
        </Modal.Body>
            <Modal.Footer className="px-4 pb-4 pt-4 border-top-0">
          <Button type="submit" className="custom-btn-primary">
            Save
          </Button>
          <Button type="button" variant="secondary" onClick={() => setShowAddQuote(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default QuoteManagement;