import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Button, Form } from "react-bootstrap";
import CustomHeader from "../../components/CustomHeader";
import CustomUtilityBox from "../../components/CustomUtilityBox";
import { textUnderlineCell, formatDate, priceCell } from "../../helper/utility";
import CustomTable from "../../components/CustomTable";
import { deleteOrder, fetchOrder } from "../../services/orderService";
import { exportData } from "../../services/exportService";
import { OrderModel } from "../../models/OrderModel";
import { showOrderInfoDialog } from "./OrderInfoDialog";
import CreateUpdateOrderDialog from "./CreateUpdateOrderDialog";
import { OrderStatusEnum } from "../../constant/OrderStatusEnum";
import UserDetailsDialog from "../userManagement/UserDetailsDialog";
import { ApiPaths } from "../../remote/apiPaths";
import CustomActionColumn from "../../components/CustomActionColumn";
import { openConfirmDialog } from "../../components/CustomConfirmDialog";
import { useForm, UseFormRegister } from "react-hook-form";
import CustomSummaryBox from "../../components/CustomSummaryBox";
import CustomDatePicker from "../../components/CustomDatePicker";
import {
    getCustomerPaymentStatusLabel,
    getOrderPartnerDisplayName,
    getPartnerPaymentStatusLabel,
} from "../../helper/orderDisplayHelpers";

const ORDER_TAB_KEYS = [2, 3, 4, 5] as const;
type OrderTabKey = (typeof ORDER_TAB_KEYS)[number];

const toIsoCalendarDate = (date: Date | null): string | null => {
    if (!date) return null;
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, "0");
    const d = `${date.getDate()}`.padStart(2, "0");
    return `${y}-${m}-${d}`;
};

const OrderManagement = () => {
    const { register, setValue } = useForm<any>();
    const { register: dateFilterRegister, setValue: setDateFilterValue } = useForm<{
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
    const [orderCountsByTab, setOrderCountsByTab] = useState<Partial<Record<OrderTabKey, number>>>({});
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
            const { response, orders, totalPages: tp } = await fetchOrder(currentPage, pageSize, {
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

    useEffect(() => {
        void refreshData();
    }, [refreshData, currentPage, selectedStatus]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const results = await Promise.all(
                ORDER_TAB_KEYS.map((key) =>
                    fetchOrder(1, 1, {
                        status: String(key),
                        ...listFilters,
                    })
                )
            );
            if (cancelled) return;
            const next: Partial<Record<OrderTabKey, number>> = {};
            ORDER_TAB_KEYS.forEach((key, i) => {
                const res = results[i];
                next[key] = res.response ? res.totalCount : 0;
            });
            setOrderCountsByTab(next);
        })();
        return () => {
            cancelled = true;
        };
    }, [listFilters]);

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
                void refreshData();
            });
        },
        [refreshData]
    );

    const userShow = useCallback(
        (userId: string) => {
            UserDetailsDialog.show(userId, () => {
                void refreshData();
            });
        },
        [refreshData]
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
                        void refreshData();
                    }
                }
            );
        },
        [refreshData]
    );

    const orderColumns = React.useMemo(
        () => [
            {
                Header: "SR No",
                accessor: "serial_no",
                Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
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
                Cell: ({ row }: { row: any }) => getOrderPartnerDisplayName(row.original as OrderModel),
            },
            {
                Header: "Order Date",
                accessor: "order_date",
                Cell: ({ row }: { row: any }) =>
                    formatDate(row.original.order_date ? row.original.order_date : ""),
            },
            { Header: "Total Price", accessor: "total_price", Cell: priceCell("total_price") },
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
                    <CustomActionColumn row={row} onDelete={() => handleOrderVoid(row.original._id)} />
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
                                CreateUpdateOrderDialog.show(false, null, () => refreshData())
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
                    searchHint={"Search name, ID, Description etc."}
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
                                    register={dateFilterRegister as unknown as UseFormRegister<any>}
                                    setValue={setDateFilterValue as (name: string, value: any) => void}
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
                                    register={dateFilterRegister as unknown as UseFormRegister<any>}
                                    setValue={setDateFilterValue as (name: string, value: any) => void}
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
