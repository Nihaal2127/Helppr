import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";
import CustomHeader from "../../components/CustomHeader";
import CustomSummaryBox from "../../components/CustomSummaryBox";
import CustomUtilityBox from "../../components/CustomUtilityBox";
import CustomTable from "../../components/CustomTable";
import CustomCloseButton from "../../components/CustomCloseButton";
import CustomActionColumn from "../../components/CustomActionColumn";
import { CustomFormInput } from "../../components/CustomFormInput";
import CustomFormSelect from "../../components/CustomFormSelect";
import { formatDate, textUnderlineCell } from "../../helper/utility";
import CustomDatePicker from "../../components/CustomDatePicker";
import { useForm, UseFormRegister } from "react-hook-form";
import type { QuoteViewData } from "./quoteViewTypes";
import type { AddQuoteFormValues, QuoteRow, QuoteTabKey } from "./quoteTypes";
import { showSuccessAlert } from "../../helper/alertHelper";
import { openConfirmDialog } from "../../components/CustomConfirmDialog";
import {
  fetchQuoteCreateOptions,
  fetchQuotes,
   QuoteListSort,
} from "../../services/quoteService";
import type { OptionType } from "../../services/quoteService";

const quoteTabs: { key: QuoteTabKey; label: string }[] = [
  { key: "new", label: "New" },
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "success", label: "Success" },
  { key: "failed", label: "Failed" },
];


const openQuoteInfoDialog = (row: QuoteRow) => {
  void import("./QuoteInfoDialog").then(({ default: QuoteInfoDialog }) => {
    QuoteInfoDialog.show(toQuoteViewData(row));
  });
};

const formatDateRange = (input?: string): string => {
  if (!input) return "-";

  // Handle common range formats:
  // - "2026-03-25T...Z - 2026-03-26T...Z"
  // - "2026-03-25T...Z to 2026-03-26T...Z"
  const trimmed = String(input).trim();

  const parts = trimmed.includes(" to ")
    ? trimmed.split(/\s+to\s+/i)
    : trimmed.split(/\s+[–—-]\s+/); // dash variants with spaces around them

  if (parts.length === 2) {
    const from = formatDate(parts[0]);
    const to = formatDate(parts[1]);
    if (from !== "-" && to !== "-") return `${from} to ${to}`;
  }

  return formatDate(trimmed);
};

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
  user_name: row.user_name,
  user_id: row.user_id,
  phone_number: row.phone_number,
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
  } = useForm<AddQuoteFormValues>({
    defaultValues: {
      quote_id: "",
      user_name: "",
      requested_services: "",
      requested_partner: "",
      requested_date: "",
      requested_time: "",
      service_price: "",
    },
  });
  const addQuote = watchAddQuote();
  const [quoteServiceOptions, setQuoteServiceOptions] = useState<OptionType[]>([]);
  const [quotePartnerOptions, setQuotePartnerOptions] = useState<OptionType[]>([]);

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
    setSortBy(next);
    setCurrentPage(1);
  }, []);

  // Keep create-modal dropdown options in sync with the mock "API".
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { quoteServiceOptions: services, quotePartnerOptions: partners } =
        await fetchQuoteCreateOptions();
      if (cancelled) return;
      setQuoteServiceOptions(services);
      setQuotePartnerOptions(partners);
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

  const handleVoidQuote = (quote: QuoteRow) => {
    openConfirmDialog(
      `Are you sure you want to void this quote (${quote.quote_id})?`,
      "Void",
      "Cancel",
      () => {
        showSuccessAlert("Quote voided (UI only)");
      }
    );
  };

  const quoteColumns = useMemo(
    () => {
      const statusColorMap: Record<string, string> = {
        new: "#0d6efd",
        pending: "#fd7e14",
        accepted: "#198754",
        success: "#20c997",
        failed: "#dc3545",
      };

      const statusCell = ({ row }: { row: any }) => {
        const statusText = String(row.original.status ?? "");
        const normalizedStatus = statusText.toLowerCase();
        const statusColor = statusColorMap[normalizedStatus] ?? "var(--content-txt-color)";
        return <span style={{ color: statusColor, fontWeight: 600 }}>{statusText}</span>;
      };

      const statusHeaderByTab: Record<QuoteTabKey, string> = {
        new: "Status",
        pending: "Status",
        accepted: "Status",
        success: "Status",
        failed: "Status",
      };

      const actionColumn = {
        Header: "Action",
        accessor: "action",
        Cell: ({ row }: { row: any }) => (
          <CustomActionColumn
            row={row}
            onDelete={() => handleVoidQuote(row.original as QuoteRow)}
          />
        ),
      };

      const defaultColumns: any[] = [
        {
          Header: "SR No",
          accessor: "serial_no",
          Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
        },
        {
          Header: "Quote ID",
          accessor: "quote_id",
          Cell: textUnderlineCell("quote_id", (row) => openQuoteInfoDialog(row)),
        },
        { Header: "Service", accessor: "requested_services", sort: true, },
        { Header: "Partner", accessor: "requested_partner" },
        { Header: "User Name", accessor: "user_name" },
        {
          Header: "Price",
          accessor: "service_price",
          Cell: ({ row }: { row: any }) => `₹${row.original.service_price ?? 0}`,
        },
        {
          Header: "Scheduled Date",
          accessor: "requested_date",
          Cell: ({ row }: { row: any }) =>
            formatDateRange(row.original.requested_date),
        },
        { Header: "Scheduled Time", accessor: "requested_time" },
        {
          Header: "Location",
          accessor: "location",
          Cell: ({ row }: { row: any }) =>
            `${row.original.door_no}, ${row.original.street}, ${row.original.city}`,
        },
      ];

      // if (selectedTab === "accepted") {
      //   const acceptedColumns: any[] = [
      //     {
      //       Header: "SR No",
      //       accessor: "serial_no",
      //       Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
      //     },
      //     {
      //       Header: "Quote ID",
      //       accessor: "quote_id",
      //       Cell: textUnderlineCell("quote_id", (row) => openQuoteInfoDialog(row)),
      //     },
      //     { Header: "Services", accessor: "requested_services" },
      //     { Header: "Partner Name", accessor: "partner_name" },
      //     { Header: "User Name", accessor: "user_name" },
      //     {
      //       Header: "Service Price",
      //       accessor: "service_price",
      //       Cell: ({ row }: { row: any }) => `₹${row.original.service_price ?? 0}`,
      //     },
      //     {
      //       Header: "Scheduled Date",
      //       accessor: "scheduled_date",
      //       Cell: ({ row }: { row: any }) =>
      //         formatDate(row.original.scheduled_date ? row.original.scheduled_date : ""),
      //     },
      //     {
      //       Header: "Time (From - To)",
      //       accessor: "time_range",
      //       Cell: ({ row }: { row: any }) =>
      //         `${row.original.service_from_time ?? "-"} - ${row.original.service_to_time ?? "-"}`,
      //     },
      //     {
      //       Header: "Location",
      //       accessor: "location",
      //       Cell: ({ row }: { row: any }) =>
      //         `${row.original.door_no}, ${row.original.street}, ${row.original.city}`,
      //     },
      //     {
      //       Header: statusHeaderByTab[selectedTab],
      //       accessor: "status",
      //       Cell: statusCell,
      //     },
      //   ];
      //   return acceptedColumns;
      // }

      if (selectedTab === "success") {
        const successColumns: any[] = [
          {
            Header: "SR No",
            accessor: "serial_no",
            Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
          },
          {
            Header: "Quote ID",
            accessor: "quote_id",
            Cell: textUnderlineCell("quote_id", (row) => openQuoteInfoDialog(row)),
          },
          {
            Header: "Order ID",
            accessor: "order_id",
            Cell: ({ row }: { row: any }) => row.original.order_id ?? "-",
          },
          {
            Header: "Service",
            accessor: "services",
            Cell: ({ row }: { row: any }) =>
              row.original.services ?? row.original.requested_services ?? "-",
          },
          { Header: "Partner", accessor: "partner_name" },
          { Header: "User Name", accessor: "user_name" },
          {
            Header: "Price",
            accessor: "service_price",
            Cell: ({ row }: { row: any }) => `₹${row.original.service_price ?? 0}`,
          },
          {
            Header: "Scheduled Date",
            accessor: "scheduled_date",
            Cell: ({ row }: { row: any }) =>
              formatDateRange(row.original.scheduled_date),
          },
          {
            Header: "Scheduled Time",
            accessor: "time",
            sort: true,
            Cell: ({ row }: { row: any }) =>
              `${row.original.service_from_time ?? "-"} – ${row.original.service_to_time ?? "-"}`,
          },
          {
            Header: "Location",
            accessor: "location",
            sort: true,
            Cell: ({ row }: { row: any }) =>
              `${row.original.door_no}, ${row.original.street}, ${row.original.city}`,
          },
          {
            Header: statusHeaderByTab[selectedTab],
            accessor: "status",
            sort: true,
            Cell: statusCell,
          },
          actionColumn,
        ];
        return successColumns;
      }

      // if (selectedTab === "failed") {
      //   const failedColumns: any[] = [
      //     {
      //       Header: "SR No",
      //       accessor: "serial_no",
      //       Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
      //     },
      //     {
      //       Header: "Quote ID",
      //       accessor: "quote_id",
      //       Cell: textUnderlineCell("quote_id", (row) => openQuoteInfoDialog(row)),
      //     },
      //     { Header: "Services", accessor: "requested_services" },
      //     { Header: "Partner Name", accessor: "partner_name" },
      //     { Header: "User Name", accessor: "user_name" },
      //     {
      //       Header: "Price",
      //       accessor: "service_price",
      //       Cell: ({ row }: { row: any }) => `₹${row.original.service_price ?? 0}`,
      //     },
      //     {
      //       Header: "Location",
      //       accessor: "location",
      //       Cell: ({ row }: { row: any }) =>
      //         `${row.original.door_no}, ${row.original.street}, ${row.original.city}`,
      //     },
      //     {
      //       Header: statusHeaderByTab[selectedTab],
      //       accessor: "status",
      //       Cell: statusCell,
      //     },
      //   ];
      //   return failedColumns;
      // }

    

      defaultColumns.push({
        Header: statusHeaderByTab[selectedTab],
        accessor: "status",
        Cell: statusCell,
      });
      defaultColumns.push(actionColumn);

      return defaultColumns;
    },
    [currentPage, pageSize, selectedTab]
  );

  useEffect(() => {
    if (showAddQuote) {
      resetAddQuote({
        quote_id: "",
        user_name: "",
        requested_services: "",
        requested_partner: "",
        requested_date: "",
        requested_time: "",
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
        searchHint={"Search name, ID etc."}
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
        onDownloadClick={async () => {}}
        onSortClick={() => {}}
        onMoreClick={() => {}}
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

      <Modal show={showAddQuote} onHide={() => setShowAddQuote(false)} centered size="lg">
        <Modal.Header className="py-3 px-4 border-bottom-0">
          <Modal.Title as="h5" className="custom-modal-title">
            Add Quote
          </Modal.Title>
          <CustomCloseButton onClose={() => setShowAddQuote(false)} />
        </Modal.Header>
        <Modal.Body className="px-4 pb-4 pt-0" 
        // style={{ maxHeight: "70vh", overflowY: "auto" }}
        >
          <form noValidate onSubmit={handleAddQuoteSubmit(onSubmitAddQuote)}>
          <div className="row">
            <div className="col-md-6">
              <CustomFormInput
                label="Quote ID"
                controlId="quote_id"
                placeholder="Enter Quote ID"
                register={addQuoteRegister}
                asCol={false}
              />
            </div>
            <div className="col-md-6">
              <CustomFormInput
                label="User Name"
                controlId="user_name"
                placeholder="Enter User Name"
                register={addQuoteRegister}
                asCol={false}
              />
            </div>
            <div className="col-md-6">
              <CustomFormSelect
                label="Requested Services"
                controlId="requested_services"
                options={quoteServiceOptions}
                register={addQuoteRegister as unknown as UseFormRegister<any>}
                fieldName="requested_services"
                asCol={false}
                defaultValue={addQuote.requested_services}
                setValue={(name: string, value: any) => {
                  setAddQuoteValue(name as keyof AddQuoteFormValues, value, { shouldValidate: true });
                }}
              />
            </div>
            <div className="col-md-6">
              <CustomFormSelect
                label="Requested Partner"
                controlId="requested_partner"
                options={quotePartnerOptions}
                register={addQuoteRegister as unknown as UseFormRegister<any>}
                fieldName="requested_partner"
                asCol={false}
                defaultValue={addQuote.requested_partner}
                setValue={(name: string, value: any) => {
                  setAddQuoteValue(name as keyof AddQuoteFormValues, value, { shouldValidate: true });
                }}
              />
            </div>
            <div className="col-md-6">
              <Form.Label className="mb-1 fw-medium">Requested Date</Form.Label>
              <CustomDatePicker
                label=""
                controlId="requested_date"
                selectedDate={addQuote.requested_date || null}
                onChange={(date) => {
                  const next = toIsoCalendarDate(date) ?? "";
                  setAddQuoteValue("requested_date", next, { shouldValidate: true });
                }}
                register={addQuoteRegister as unknown as UseFormRegister<any>}
                setValue={setAddQuoteValue as (name: string, value: any) => void}
                asCol={false}
                groupClassName="mb-0 w-100"
                placeholderText="Requested Date"
                filterDate={() => true}
              />
            </div>
            <div className="col-md-6">
              <CustomFormInput
                label="Requested Time"
                controlId="requested_time"
                placeholder="e.g. 10:00 AM to 12:00 PM"
                register={addQuoteRegister}
                asCol={false}
              />
            </div>
            <div className="col-md-6">
              <CustomFormInput
                label="Service Price"
                controlId="service_price"
                placeholder="Enter Price"
                register={addQuoteRegister}
                asCol={false}
                inputType="number"
              />
            </div>
          </div>
          <Modal.Footer className="px-4 pb-4 pt-0 border-top-0">
          <Button type="submit" className="custom-btn-primary">
            Save
          </Button>
          <Button type="button" variant="secondary" onClick={() => setShowAddQuote(false)}>
            Cancel
          </Button>
        </Modal.Footer>
          </form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default QuoteManagement;