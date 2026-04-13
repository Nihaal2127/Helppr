
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "react-bootstrap";
import { useForm, UseFormRegister } from "react-hook-form";
import CustomHeader from "../../../components/CustomHeader";
import { FinancialSubPageBackButton } from "../../../components/FinancialSubPageNav";
import CustomUtilityBox from "../../../components/CustomUtilityBox";
import CustomTable from "../../../components/CustomTable";
import CustomDatePicker from "../../../components/CustomDatePicker";
import CustomActionColumn from "../../../components/CustomActionColumn";
import { AppConstant } from "../../../constant/AppConstant";
import { deleteOrder, fetchOrder } from "../../../services/orderService";
import { OrderModel } from "../../../models/OrderModel";
import { showSuccessAlert } from "../../../helper/alertHelper";
import { formatDate } from "../../../helper/utility";
import AddEditRefund, {
  RefundFormPayload,
  RefundOrderOption,
  RefundRow,
} from "./AddEditRefund";
import { openConfirmDialog } from "../../../components/CustomConfirmDialog";

function money(n: number | null | undefined): string {
  if (n === undefined || n === null || Number.isNaN(Number(n))) return "—";
  return `${AppConstant.currencySymbol}${Number(n).toFixed(2)}`;
}

const toIsoCalendarDate = (date: Date | null): string | null => {
  if (!date) return null;
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const RefundsPage = () => {
  const { register: headerRegister, setValue: setHeaderValue } = useForm<{ franchise_id: string }>({
    defaultValues: { franchise_id: "all" },
  });

  const {
    register: quoteFilterRegister,
    setValue: setQuoteFilterValue,
  } = useForm<{
    from_date: string;
    to_date: string;
  }>({
    defaultValues: { from_date: "", to_date: "" },
  });

  const fetchRef = useRef(false);

  const [ordersLoading, setOrdersLoading] = useState(true);
  const [refundRows, setRefundRows] = useState<RefundRow[]>([]);
  const [refundOrderOptions, setRefundOrderOptions] = useState<RefundOrderOption[]>([]);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [submittingRefund, setSubmittingRefund] = useState(false);

  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [utilitySearchKey, setUtilitySearchKey] = useState(0);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadRefundRows = useCallback(async () => {
    if (fetchRef.current) return;
    fetchRef.current = true;
    setOrdersLoading(true);

    try {
      const { response, orders } = await fetchOrder(1, 200, {});
      if (response) {
        const list = orders ?? [];
        const mappedRows: RefundRow[] = list.map((o: OrderModel) => ({
          _id: o._id || `${Date.now()}-${Math.random()}`,
          order_id: o._id || "",
          order_unique_id: o.unique_id ?? o._id ?? "-",
          user_name: o.user_name || "-",
          total_amount: Number(o.total_price) || 0,
          refund_amount: undefined,
          from_admin_commission: undefined,
          from_partner_wallet: undefined,
          created_at: o.created_at || o.updated_at || null,
        }));

        const orderOpts: RefundOrderOption[] = list.map((o: OrderModel) => {
          const partner_wallet_total = (o.service_items || []).reduce(
            (sum, item) => sum + (Number(item.partner_earning) || 0),
            0
          );
          return {
            _id: o._id || "",
            order_unique_id: o.unique_id ?? o._id ?? "-",
            user_name: o.user_name || "-",
            total_amount: Number(o.total_price) || 0,
            admin_earning: Number(o.admin_earning) || 0,
            partner_wallet_total,
          };
        });

        setRefundRows(mappedRows);
        setRefundOrderOptions(orderOpts);
      }
    } finally {
      setOrdersLoading(false);
      fetchRef.current = false;
    }
  }, []);

  useEffect(() => {
    void loadRefundRows();
  }, [loadRefundRows]);

  const handleVoidOrder = useCallback(
    (row: RefundRow) => {
    const id = row.order_id || row._id;
    const display = row.order_unique_id ?? id ?? "-";

    if (!id) return;

    openConfirmDialog(
      `Are you sure you want to void this order (${display})?`,
      "Void",
      "Cancel",
      async () => {
        await deleteOrder(String(id));
        setCurrentPage(1);
        await loadRefundRows();
      }
    );
    },
    [loadRefundRows]
  );

  const filteredRows = useMemo(() => {
    let list = [...refundRows];

    if (fromDate) {
      const fromTs = new Date(fromDate).setHours(0, 0, 0, 0);
      list = list.filter((item) => {
        if (!item.created_at) return true;
        return new Date(item.created_at).getTime() >= fromTs;
      });
    }

    if (toDate) {
      const toTs = new Date(toDate).setHours(23, 59, 59, 999);
      list = list.filter((item) => {
        if (!item.created_at) return true;
        return new Date(item.created_at).getTime() <= toTs;
      });
    }

    if (searchValue.trim()) {
      const keyword = searchValue.trim().toLowerCase();
      list = list.filter((item) => {
        return (
          String(item.order_unique_id).toLowerCase().includes(keyword) ||
          String(item.user_name).toLowerCase().includes(keyword)
        );
      });
    }

    return list;
  }, [refundRows, fromDate, toDate, searchValue]);

  const totalPages = useMemo(() => {
    if (!filteredRows.length) return 0;
    return Math.ceil(filteredRows.length / pageSize);
  }, [filteredRows, pageSize]);

  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const handleRefundSave = async (payload: RefundFormPayload) => {
    setSubmittingRefund(true);

    try {
      const newRow: RefundRow = {
        _id: `${Date.now()}`,
        order_id: payload.order_id,
        order_unique_id: payload.order_unique_id,
        user_name: payload.user_name,
        total_amount: payload.total_amount,
        refund_amount: payload.refund_amount,
        from_admin_commission: payload.from_admin_commission,
        from_partner_wallet: payload.from_partner_wallet,
        created_at: payload.created_at,
      };

      setRefundRows((prev) => [newRow, ...prev]);
      setShowRefundModal(false);
      showSuccessAlert("Refund added successfully.");
    } finally {
      setSubmittingRefund(false);
    }
  };

  const refundColumns = useMemo(
    () => [
      {
        Header: "S.No",
        accessor: "serial_no",
        Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
      },
      {
        Header: "Order ID",
        accessor: "order_unique_id",
      },
      { Header: "User Name", accessor: "user_name" },
      {
        Header: "Total Amount",
        accessor: "total_amount",
        Cell: ({ row }: { row: any }) => money(row.original.total_amount),
      },
      {
        Header: "Refund Amount",
        accessor: "refund_amount",
        Cell: ({ row }: { row: any }) =>
          row.original.refund_amount !== undefined ? money(row.original.refund_amount) : "—",
      },
      {
        Header: "From Admin Commission",
        accessor: "from_admin_commission",
        Cell: ({ row }: { row: any }) =>
          row.original.from_admin_commission !== undefined
            ? money(row.original.from_admin_commission)
            : "—",
      },
      {
        Header: "From Partner Wallet",
        accessor: "from_partner_wallet",
        Cell: ({ row }: { row: any }) =>
          row.original.from_partner_wallet !== undefined
            ? money(row.original.from_partner_wallet)
            : "—",
      },
      {
        Header: "Date",
        accessor: "created_at",
        Cell: ({ row }: { row: any }) => formatDate(row.original.created_at || ""),
      },
      {
        Header: "Action",
        accessor: "action",
        Cell: ({ row }: { row: { original: RefundRow } }) => (
          <CustomActionColumn
            row={row}
            onDelete={() => handleVoidOrder(row.original)}
          />
        ),
      },
    ],
    [currentPage, pageSize, handleVoidOrder]
  );

  return (
    <div className="main-page-content">
      <CustomHeader
        title="Financial — Refunds"
        titlePrefix={<FinancialSubPageBackButton />}
        register={headerRegister as unknown as UseFormRegister<any>}
        setValue={setHeaderValue as (name: string, value: any) => void}
        rightActions={
          <Button type="button" className="custom-btn-secondary w-auto btn btn-primary" onClick={() => setShowRefundModal(true)}>
            Add Refund
          </Button>
        }
      />

      <CustomUtilityBox
        key={utilitySearchKey}
        title="Refunds"
        searchHint="Search Order ID, User Name..."
        toolsInlineRow
        hideMoreIcon
        controlSlot={
          <>
            <div style={{ minWidth: "220px" }}>
              <CustomDatePicker
                label="From Date"
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
                groupClassName="mb-0 w-100 fw-medium"
                placeholderText="From Date"
                filterDate={() => true}
              />
            </div>

            <div style={{ minWidth: "220px" }}>
              <CustomDatePicker
                label="To Date"
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
                groupClassName="mb-0 w-100 fw-medium"
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
            disabled={!fromDate && !toDate && !searchValue.trim()}
            onClick={() => {
              setFromDate(null);
              setToDate(null);
              setSearchValue("");
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
          setSearchValue(value);
          setCurrentPage(1);
        }}
      />

      {ordersLoading ? (
        <div className="bg-white border rounded p-4 text-center">Loading...</div>
      ) : (
        <CustomTable
          columns={refundColumns}
          data={pagedRows}
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
      )}

      <AddEditRefund
        show={showRefundModal}
        onHide={() => setShowRefundModal(false)}
        orderOptions={refundOrderOptions}
        ordersLoading={ordersLoading}
        refundData={null}
        onSave={handleRefundSave}
        isSubmitting={submittingRefund}
      />
    </div>
  );
};

export default RefundsPage;