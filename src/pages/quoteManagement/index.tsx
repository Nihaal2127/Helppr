import React, { useEffect, useMemo, useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";
import CustomHeader from "../../components/CustomHeader";
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
import { showSuccessAlert } from "../../helper/alertHelper";
import { openConfirmDialog } from "../../components/CustomConfirmDialog";

type QuoteTabKey = "new" | "pending" | "accepted" | "success" | "failed";
type AddQuoteFormValues = {
  quote_id: string;
  user_name: string;
  requested_services: string;
  requested_partner: string;
  requested_date: string;
  requested_time: string;
  service_price: string;
};

type QuoteRow = {
  _id: string;
  quote_id: string;
  requested_services: string;
  requested_partner: string;
  partner_name?: string;
  employee_id?: string;
  employee_name?: string;
  user_name: string;
  door_no: string;
  street: string;
  city: string;
  requested_date: string;
  requested_time: string;
  service_price?: number;
  scheduled_date?: string;
  service_from_time?: string;
  service_to_time?: string;
  order_id?: string;
  services?: string;
  order_status?: string;
  payment_method?: string;
  payment_status?: string;
  payment_reference?: string;
  payment_date?: string;
  /** Quoted / offered service price */
  status: string;
  /** Enriched fields for New-tab quote view modal */
  user_id?: string;
  phone_number?: string;
  user_city?: string;
  profile_url?: string | null;
  category_id?: string;
  category_name?: string;
  area?: string;
  landmark?: string;
  pincode?: string;
  service_id?: string;
  partner_id?: string;
  partner_user_id?: string;
  partner_phone?: string;
  partner_city?: string;
};

const quoteTabs: { key: QuoteTabKey; label: string }[] = [
  { key: "new", label: "New" },
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "success", label: "Success" },
  { key: "failed", label: "Failed" },
];

const quoteDataByTab: Record<QuoteTabKey, QuoteRow[]> = {
  new: [
    {
      _id: "1",
      quote_id: "Q1001",
      requested_services: "Home Cleaning",
      requested_partner: "Partner A",
      employee_id: "EMP1001",
      employee_name: "John Mathew",
      user_name: "Amit Kumar",
      door_no: "12-4/7",
      street: "Madhapur Main Road",
      city: "Hyderabad",
      requested_date: "2026-03-24T00:00:00.000Z to 2026-03-25T00:00:00.000Z",
      requested_time: "-",
      service_price: 4500,
      status: "New",
      user_id: "U1003",
      phone_number: "+919879879871",
      user_city: "Hyderabad",
      category_id: "C1001",
      category_name: "Home Services",
      area: "Madhapur",
      landmark: "Near Durgam Cheruvu",
      pincode: "500081",
    },
    {
      _id: "2",
      quote_id: "Q1002",
      requested_services: "AC Repair",
      requested_partner: "Partner B",
      employee_id: "EMP1002",
      employee_name: "Priyanka Rao",
      user_name: "Sneha Reddy",
      door_no: "8-2-110",
      street: "Banjara Hills Road No. 2",
      city: "Hyderabad",
      requested_date: "2026-03-25T00:00:00.000Z",
      requested_time: "02:30 PM to 04:00 PM",
      service_price: 4500,
      status: "New",
      user_id: "U1004",
      phone_number: "+919812345678",
      user_city: "Hyderabad",
      category_id: "C1002",
      category_name: "Appliance Repair",
      area: "Banjara Hills",
      pincode: "500034",
    },
  ],
  pending: [
    {
      _id: "3",
      quote_id: "Q1003",
      requested_services: "Plumbing",
      requested_partner: "Partner C",
      employee_id: "EMP1003",
      employee_name: "Rahul Das",
      user_name: "Rahul Verma",
      door_no: "5-9-21",
      street: "Begumpet Main Street",
      city: "Hyderabad",
      requested_date: "2026-03-26T00:00:00.000Z to 2026-03-27T00:00:00.000Z",
      requested_time: "-",
      service_price: 4500,
      status: "Pending",
      user_id: "U1005",
      phone_number: "+919876543210",
      user_city: "Hyderabad",
      category_id: "C1003",
      category_name: "Plumbing & Sanitary",
      area: "Begumpet",
      landmark: "Near Passport Office",
      pincode: "500016",
    },
  ],
  accepted: [
    {
      _id: "4",
      quote_id: "Q1004",
      requested_services: "Deep Cleaning",
      requested_partner: "Partner D",
      employee_id: "EMP1004",
      employee_name: "Neha Kapoor",
      partner_name: "Ravi Services",
      user_name: "Neha Sharma",
      door_no: "3-6-91",
      street: "Himayatnagar",
      city: "Hyderabad",
      requested_date: "2026-03-27T00:00:00.000Z",
      requested_time: "09:00 AM to 11:00 AM",
      service_price: 4500,
      scheduled_date: "2026-03-29T00:00:00.000Z",
      service_from_time: "10:00 AM",
      service_to_time: "12:00 PM",
      status: "Accepted",
      user_id: "U1010",
      phone_number: "+919911223344",
      user_city: "Hyderabad",
      category_id: "C1010",
      category_name: "Cleaning",
      area: "Himayatnagar",
      pincode: "500029",
      partner_user_id: "P2040",
      partner_phone: "+919988776655",
      partner_city: "Hyderabad",
    },
  ],
  success: [
    {
      _id: "5",
      quote_id: "Q1005",
      order_id: "O1048",
      order_status: "Completed",
      requested_services: "Home Cleaning, AC Service",
      services: "Home Cleaning, AC Service",
      requested_partner: "Partner E",
      partner_name: "Suresh Home Care",
      user_name: "Priya Nair",
      door_no: "1-2-3",
      street: "Kukatpally",
      city: "Hyderabad",
      requested_date: "2026-03-20T00:00:00.000Z to 2026-03-21T00:00:00.000Z",
      requested_time: "-",
      service_price: 4500,
      scheduled_date: "2026-03-30T00:00:00.000Z",
      service_from_time: "09:00 AM",
      service_to_time: "01:00 PM",
      status: "Success",
      user_id: "U1020",
      phone_number: "+919955443322",
      user_city: "Hyderabad",
      category_id: "C1001",
      category_name: "Home Services",
      area: "Kukatpally",
      landmark: "Near Metro",
      pincode: "500072",
      partner_user_id: "P2090",
      partner_phone: "+919944332211",
      partner_city: "Hyderabad",
      payment_method: "UPI",
      payment_status: "Paid",
      payment_reference: "TXN-882910",
      payment_date: "2026-03-28T00:00:00.000Z",
    },
  ],
  failed: [
    {
      _id: "6",
      quote_id: "Q1006",
      requested_services: "Electrical Wiring",
      requested_partner: "Partner F",
      partner_name: "Vijay Electricals",
      employee_id: "EMP1006",
      employee_name: "Kiran Nair",
      user_name: "Karthik Rao",
      door_no: "4-1-88",
      street: "Ameerpet",
      city: "Hyderabad",
      requested_date: "2026-03-19T00:00:00.000Z",
      requested_time: "03:00 PM to 05:00 PM",
      service_price: 4500,
      status: "Failed",
      user_id: "U1030",
      phone_number: "+919933221100",
      user_city: "Hyderabad",
      category_id: "C1020",
      category_name: "Electrical",
      area: "Ameerpet",
      landmark: "Near Metro",
      pincode: "500016",
      service_id: "S9001",
      partner_id: "P2200",
      partner_user_id: "P2200",
      partner_phone: "+919922110099",
      partner_city: "Hyderabad",
      scheduled_date: "2026-03-22T00:00:00.000Z",
      service_from_time: "03:00 PM",
      service_to_time: "05:00 PM",
    },
  ],
};

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

const parseQuoteDateToMs = (input?: string): number | null => {
  if (!input) return null;
  const trimmed = String(input).trim();
  if (!trimmed) return null;

  const fromPart = trimmed.includes(" to ")
    ? trimmed.split(/\s+to\s+/i)[0]
    : trimmed.split(/\s+[–—-]\s+/)[0];

  const dt = new Date(fromPart);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.getTime();
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
  const quoteServiceOptions = useMemo(
    () => Array.from(
      new Set(
        (Object.values(quoteDataByTab).flat() as QuoteRow[])
          .flatMap((row) => String(row.requested_services || "").split(","))
          .map((service) => service.trim())
          .filter(Boolean)
      )
    ).map((service) => ({ value: service, label: service })),
    []
  );
  const quotePartnerOptions = useMemo(
    () => Array.from(
      new Set(
        (Object.values(quoteDataByTab).flat() as QuoteRow[])
          .map((row) => String(row.requested_partner || "").trim())
          .filter(Boolean)
      )
    ).map((partner) => ({ value: partner, label: partner })),
    []
  );
  const filteredQuotes = useMemo(() => {
    const rows = quoteDataByTab[selectedTab];
    const keyword = searchKeyword.trim().toLowerCase();

    const fromTs = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : null;
    const toTs = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : null;

    return rows.filter((row) => {
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

      const matchesKeyword = !keyword || searchable.includes(keyword);

      const rowDateTs = parseQuoteDateToMs(
        selectedTab === "accepted" || selectedTab === "success"
          ? row.scheduled_date || row.requested_date
          : row.requested_date
      );
      const matchesFrom = fromTs == null || (rowDateTs != null && rowDateTs >= fromTs);
      const matchesTo = toTs == null || (rowDateTs != null && rowDateTs <= toTs);

      return matchesKeyword && matchesFrom && matchesTo;
    });
  }, [selectedTab, searchKeyword, fromDate, toDate]);

  const totalPages = useMemo(() => {
    if (!filteredQuotes.length) return 0;
    return Math.ceil(filteredQuotes.length / pageSize);
  }, [filteredQuotes, pageSize]);

  const pagedQuotes = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredQuotes.slice(start, start + pageSize);
  }, [filteredQuotes, currentPage, pageSize]);

  const handleTabClick = (tabKey: QuoteTabKey) => {
    setSelectedTab(tabKey);
    setCurrentPage(1);
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
        { Header: "Service", accessor: "requested_services" },
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
            Cell: ({ row }: { row: any }) =>
              `${row.original.service_from_time ?? "-"} – ${row.original.service_to_time ?? "-"}`,
          },
          {
            Header: "Location",
            accessor: "location",
            Cell: ({ row }: { row: any }) =>
              `${row.original.door_no}, ${row.original.street}, ${row.original.city}`,
          },
          {
            Header: statusHeaderByTab[selectedTab],
            accessor: "status",
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
          <Button className="custom-btn-secondary w-auto" onClick={() => setShowAddQuote(true)}>
            Create Quote
          </Button>
        }
        register={register}
        setValue={setValue}
      />

      <div className="d-flex mt-4 gap-2">
        {quoteTabs.map((tab) => (
          <Button
            key={tab.key}
            className={selectedTab === tab.key ? "custom-btn-primary" : "custom-btn-secondary"}
            onClick={() => handleTabClick(tab.key)}
          >
            {tab.label}
          </Button>
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
        data={pagedQuotes}
        pageSize={pageSize}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(page: number) => setCurrentPage(page)}
        onLimitChange={(updatedPageSize: number) => {
          setPageSize(updatedPageSize);
          setCurrentPage(1);
        }}
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