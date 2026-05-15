import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { Button, Form } from "react-bootstrap";
import CustomHeader from "../../components/CustomHeader";
import CustomUtilityBox from "../../components/CustomUtilityBox";
import { textUnderlineCell, formatDate, priceCell } from "../../helper/utility";
import CustomTable from "../../components/CustomTable";
import { deleteOrder, fetchOrder } from "../../lib/order/orderService";
import { exportData } from "../../services/exportService";
import { OrderModel } from "../../lib/order/OrderModel";
import { showOrderInfoDialog } from "../../components/order";
import CreateUpdateOrderDialog from "./CreateUpdateOrderDialog";
import { OrderStatusEnum } from "../../lib/order/OrderStatusEnum";
import { UserDetailsDialog } from "../../components/user";
import { ApiPaths } from "../../lib/global/remote/apiPaths";
import CustomActionColumn from "../../components/CustomActionColumn";
import { openConfirmDialog } from "../../components/CustomConfirmDialog";
import { useForm, UseFormRegister } from "react-hook-form";
import CustomSummaryBox from "../../components/CustomSummaryBox";
import CustomDatePicker from "../../components/CustomDatePicker";
import {
  getCustomerPaymentStatusLabel,
  getOrderPartnerDisplayName,
  getPartnerPaymentStatusLabel,
} from "../../lib/order/orderDisplayHelpers";
import { getCount } from "../../services/getCountService";
import {
  FRANCHISE_HEADER_ALL,
  useFranchiseHeaderForm,
} from "../../lib/global/hooks/useFranchiseScopedGetCount";

const ORDER_TAB_KEYS = [2, 3, 4, 5] as const;
type OrderTabKey = (typeof ORDER_TAB_KEYS)[number];

/**
 * Maps `getCount` `record` for `type: "order-management"` into tab totals (status keys 2–5).
 */
function mapGetCountRecordToOrderTabCounts(
  record: Record<string, unknown> | null | undefined
): Partial<Record<OrderTabKey, number>> | null {
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
  const out: Partial<Record<OrderTabKey, number>> = {};
  const assign = (key: OrderTabKey, ...aliases: string[]) => {
    const n = pick(...aliases);
    if (n !== null) out[key] = n;
  };
  assign(
    2,
    "order_in_progress",
    "in_progress",
    "orders_in_progress",
    "order_status_2",
    "status_2",
    "total_order_in_progress"
  );
  assign(
    3,
    "order_completed",
    "completed",
    "orders_completed",
    "order_status_3",
    "status_3",
    "total_order_completed"
  );
  assign(
    4,
    "order_cancelled",
    "cancelled",
    "orders_cancelled",
    "order_status_4",
    "status_4",
    "total_order_cancelled"
  );
  assign(
    5,
    "order_refunded",
    "refunded",
    "orders_refunded",
    "order_status_5",
    "status_5",
    "total_order_refunded"
  );
  if (Object.keys(out).length === 0) return null;
  for (const k of ORDER_TAB_KEYS) {
    if (out[k] === undefined) out[k] = 0;
  }
  return out;
}

const toIsoCalendarDate = (date: Date | null): string | null => {
  if (!date) return null;
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const OrderManagement = () => {
  const { register, setValue, franchiseId: headerFranchiseId } =
    useFranchiseHeaderForm();
  const { register: dateFilterRegister, setValue: setDateFilterValue } =
    useForm<{
      from_date: string;
      to_date: string;
    }>({
      defaultValues: { from_date: "", to_date: "" },
    });

  const [selectedStatus, setSelectedStatus] = useState<OrderTabKey>(2);
  const [orderList, setOrderList] = useState<OrderModel[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [utilitySearchKey, setUtilitySearchKey] = useState(0);
  const [orderCountsByTab, setOrderCountsByTab] = useState<
    Partial<Record<OrderTabKey, number>>
  >({});
  const fetchRef = useRef(false);

  const listFilters = useMemo(
    () => ({
      from_date: fromDate,
      to_date: toDate,
    }),
    [fromDate, toDate]
  );

  const fetchData = useCallback(
    async (filters: { keyword?: string; status?: string; sort?: string }) => {
      if (fetchRef.current) return;
      fetchRef.current = true;
      const {
        response,
        orders,
        totalPages: tp,
      } = await fetchOrder(currentPage, pageSize, {
        ...filters,
        ...listFilters,
      });
      if (response) {
        setOrderList(orders);
        setTotalPages(tp);
      }
      fetchRef.current = false;
    },
    [currentPage, pageSize, listFilters]
  );

  const refreshData = useCallback(async () => {
    await fetchData({ status: selectedStatus.toString() });
  }, [fetchData, selectedStatus]);

  /** Tab badges: `POST /getCount` `{ type: "order-management", franchise_id? }`; falls back to list totals if unmapped. */
  const reloadTabCounts = useCallback(async () => {
    const fid = String(headerFranchiseId ?? "").trim();
    const scope =
      fid && fid !== FRANCHISE_HEADER_ALL ? { franchise_id: fid } : undefined;
    const { responseCount, countModel } = await getCount(
      "order-management",
      scope
    );
    const rec =
      countModel != null
        ? (countModel as unknown as Record<string, unknown>)
        : null;
    const mapped =
      responseCount && rec ? mapGetCountRecordToOrderTabCounts(rec) : null;
    if (mapped) {
      setOrderCountsByTab(mapped);
      return;
    }
    const results = await Promise.all(
      ORDER_TAB_KEYS.map((key) =>
        fetchOrder(1, 1, {
          status: String(key),
          ...listFilters,
        })
      )
    );
    const next: Partial<Record<OrderTabKey, number>> = {};
    ORDER_TAB_KEYS.forEach((key, i) => {
      const res = results[i];
      next[key] = res.response ? res.totalCount : 0;
    });
    setOrderCountsByTab(next);
  }, [headerFranchiseId, listFilters]);

  const bumpListsAndTabCounts = useCallback(async () => {
    await reloadTabCounts();
    await refreshData();
  }, [reloadTabCounts, refreshData]);

  useEffect(() => {
    void refreshData();
  }, [refreshData, currentPage, selectedStatus]);

  useEffect(() => {
    void reloadTabCounts();
  }, [reloadTabCounts]);

  const handleFilterChange = async (filters: {
    keyword?: string;
    status?: string;
    sort?: string;
  }) => {
    setCurrentPage(1);
    setTotalPages(0);
    if (Object.keys(filters).length === 0) {
      fetchRef.current = false;
    } else {
      await fetchData({
        ...filters,
        status: filters.status ?? selectedStatus.toString(),
        ...listFilters,
      });
    }
  };

  const handleStatusCardSelect = (statusKey: OrderTabKey) => {
    setSelectedStatus(statusKey);
    setCurrentPage(1);
  };

  const orderShow = useCallback(
    (id: string) => {
      showOrderInfoDialog(id, () => {
        void bumpListsAndTabCounts();
      });
    },
    [bumpListsAndTabCounts]
  );

  const userShow = useCallback(
    (userId: string) => {
      UserDetailsDialog.show(userId, () => {
        void bumpListsAndTabCounts();
      });
    },
    [bumpListsAndTabCounts]
  );

  const handleOrderVoid = useCallback(
    (orderId: string) => {
      openConfirmDialog(
        "Are you sure you want to void this order?",
        "Void",
        "Cancel",
        async () => {
          const response = await deleteOrder(orderId);
          if (response) {
            void bumpListsAndTabCounts();
          }
        }
      );
    },
    [bumpListsAndTabCounts]
  );

  const orderColumns = React.useMemo(
    () => [
      {
        Header: "SR No",
        accessor: "serial_no",
        Cell: ({ row }: { row: any }) =>
          (currentPage - 1) * pageSize + row.index + 1,
      },
      {
        Header: "Order ID",
        accessor: "unique_id",
        Cell: textUnderlineCell("unique_id", (row) => orderShow(row._id)),
      },
      {
        Header: "User Name",
        accessor: "user_name",
        Cell: ({ row }: { row: any }) => {
          const o = row.original as OrderModel;
          const label = o.user_name || o.user_info?.name || "-";
          return (
            <span
              style={{
                textDecoration: "underline",
                textDecorationThickness: "1px",
                cursor: "pointer",
              }}
              onClick={() => userShow(o.user_id)}
            >
              {label}
            </span>
          );
        },
      },
      {
        Header: "Partner Name",
        accessor: "partner_display",
        Cell: ({ row }: { row: any }) =>
          getOrderPartnerDisplayName(row.original as OrderModel),
      },
      {
        Header: "Order Date",
        accessor: "order_date",
        Cell: ({ row }: { row: any }) =>
          formatDate(row.original.order_date ? row.original.order_date : ""),
      },
      {
        Header: "Total Price",
        accessor: "total_price",
        Cell: priceCell("total_price"),
      },
      {
        Header: "Partner Payment Status",
        accessor: "partner_payment_status_col",
        Cell: ({ row }: { row: any }) =>
          getPartnerPaymentStatusLabel(row.original as OrderModel),
      },
      {
        Header: "User Payment Status",
        accessor: "user_payment_status_col",
        Cell: ({ row }: { row: any }) =>
          getCustomerPaymentStatusLabel(row.original as OrderModel),
      },
      {
        Header: "Action",
        accessor: "action",
        Cell: ({ row }: { row: any }) => (
          <CustomActionColumn
            row={row}
            onDelete={() => handleOrderVoid(row.original._id)}
          />
        ),
      },
    ],
    [currentPage, pageSize, handleOrderVoid, orderShow, userShow]
  );

  return (
    <>
      <div className="main-page-content">
        <CustomHeader
          title="Order Management"
          rightActions={
            <button
              type="button"
              className="custom-btn-secondary w-auto"
              onClick={() =>
                CreateUpdateOrderDialog.show(false, null, () =>
                  bumpListsAndTabCounts()
                )
              }
            >
              Create Order
            </button>
          }
          register={register}
          setValue={setValue}
        />

        <div className="d-flex mt-4 gap-2">
          {ORDER_TAB_KEYS.map((key) => {
            const meta = OrderStatusEnum.get(key);
            if (!meta) return null;
            return (
              <CustomSummaryBox
                key={key}
                divId={`order-tab-${key}`}
                title={meta.label}
                data={{ Total: orderCountsByTab[key] ?? 0 }}
                onSelect={() => handleStatusCardSelect(key)}
                isSelected={selectedStatus === key}
                onFilterChange={() => {}}
                isAddShow={false}
              />
            );
          })}
        </div>

        <CustomUtilityBox
          key={utilitySearchKey}
          title="Orders"
          searchHint={"Search order ID"}
          toolsInlineRow
          hideMoreIcon
          controlSlot={
            <>
              <div style={{ minWidth: "220px" }}>
                <Form.Label className="mb-1 fw-medium">From Date</Form.Label>
                <CustomDatePicker
                  label=""
                  controlId="order_from_date"
                  selectedDate={fromDate}
                  onChange={(date) => {
                    const next = toIsoCalendarDate(date);
                    setFromDate(next);
                    setCurrentPage(1);
                  }}
                  register={
                    dateFilterRegister as unknown as UseFormRegister<any>
                  }
                  setValue={
                    setDateFilterValue as (name: string, value: any) => void
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
                  controlId="order_to_date"
                  selectedDate={toDate}
                  onChange={(date) => {
                    const next = toIsoCalendarDate(date);
                    setToDate(next);
                    setCurrentPage(1);
                  }}
                  register={
                    dateFilterRegister as unknown as UseFormRegister<any>
                  }
                  setValue={
                    setDateFilterValue as (name: string, value: any) => void
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
              disabled={!fromDate && !toDate}
              onClick={() => {
                setFromDate(null);
                setToDate(null);
                setDateFilterValue("from_date", "");
                setDateFilterValue("to_date", "");
                setUtilitySearchKey((k) => k + 1);
                setCurrentPage(1);
              }}
            >
              Clear
            </Button>
          }
          onDownloadClick={async () => {
            await exportData(ApiPaths.EXPORT_ORDER, {
              order_status: selectedStatus,
              ...(fromDate && { from_date: fromDate }),
              ...(toDate && { to_date: toDate }),
            });
          }}
          onSortClick={(value) => {
            handleFilterChange({
              sort: value,
              status: selectedStatus.toString(),
            });
          }}
          onMoreClick={() => {}}
          onSearch={(value) => handleFilterChange({ keyword: value })}
        />

        <CustomTable
          columns={orderColumns}
          data={orderList}
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
    </>
  );
};

export default OrderManagement;
