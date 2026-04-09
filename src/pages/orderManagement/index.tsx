import React, { useState, useEffect, useCallback, useRef } from "react";
import CustomHeader from "../../components/CustomHeader";
import CustomUtilityBox from "../../components/CustomUtilityBox";
import { textUnderlineCell, formatDate, priceCell, showLog, } from "../../helper/utility";
import CustomTable from "../../components/CustomTable";
import { deleteOrder, fetchOrder } from "../../services/orderService";
import { exportData } from "../../services/exportService";
import { OrderModel } from "../../models/OrderModel";
import OrderInfoDialog from "./OrderInfoDialog";
import { Button } from "react-bootstrap";
import { OrderStatusEnum } from "../../constant/OrderStatusEnum";
import CreateUpdateOrderDialog from "./CreateUpdateOrderDialog";
import { OrderPaymentModeEnum } from "../../constant/PaymentEnum";
import UserDetailsDialog from "../userManagement/UserDetailsDialog";
import { ApiPaths } from "../../remote/apiPaths";
import CustomActionColumn from "../../components/CustomActionColumn";
import { openConfirmDialog } from "../../components/CustomConfirmDialog";
import { useForm } from "react-hook-form";

const OrderManagement = () => {
    // const statuses = Array.from(OrderStatusEnum.entries());
    const statuses = Array.from(OrderStatusEnum.entries()).filter(
        ([key]) => key !== 1 // remove "Pending"
    );
    const { register, setValue } = useForm<any>();

    const [selectedStatus, setSelectedStatus] = useState(statuses[0][0]);
    const [orderList, setOrderList] = useState<OrderModel[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const fetchRef = useRef(false);

    const fetchData = useCallback(async (filters: {
        keyword?: string;
        status?: string;
        sort?: string;
    }) => {
        if (fetchRef.current) return;
        fetchRef.current = true;
        const { response, orders, totalPages } = await fetchOrder(currentPage, pageSize, { ...filters, });
        if (response) {
            setOrderList(orders);
            setTotalPages(totalPages);
        }
        fetchRef.current = false;
    }, [currentPage, pageSize]);

    useEffect(() => {
        refreshData();
    }, [selectedStatus, currentPage]);

    const refreshData = async () => {
        await fetchData({ status: selectedStatus.toString() });
    };

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
            await fetchData(filters);
        }
    };

    const handleStatusClick = async (statusKey: number) => {
        setSelectedStatus(statusKey);
        await handleFilterChange({ status: statusKey.toString() });
    };

    const orderShow = (orderId: string) => {
        OrderInfoDialog.show(orderId, () => refreshData())
    }

    const userShow = (userId: string) => {
        UserDetailsDialog.show(userId, () => refreshData())
    }

    const handleOrderVoid = (orderId: string) => {
        openConfirmDialog(
            "Are you sure you want to void this order?",
            "Void",
            "Cancel",
            async () => {
                const response = await deleteOrder(orderId);
                if (response) {
                    refreshData();
                }
            }
        );
    };

    const orderColumns = React.useMemo(() => [
        {
            Header: "SR No",
            accessor: "serial_no",
            Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
        },
        {
            Header: "Order ID", accessor: "unique_id",
            Cell: textUnderlineCell("unique_id", (row) => orderShow(row._id)),
        },
        {
            Header: "User ID", accessor: "user_unique_id",
            Cell: textUnderlineCell("user_unique_id", (row) => userShow(row.user_id)),
        },
        {
            Header: "Order Date",
            accessor: "order_date",
            Cell: ({ row }) => formatDate(row.original.order_date ? row.original.order_date : ""),
        },
        { Header: "Total Price", accessor: "total_price", Cell: priceCell("total_price"), },
        { Header: "Location", accessor: "city_name" },
        {
            Header: "Payment Mode",
            accessor: "payment_mode_id",
            Cell: ({ row }) => OrderPaymentModeEnum.get(Number(row.original.payment_mode_id))?.label || "-",
        }, {
            Header: "Action",
            accessor: "action",
            Cell: ({ row }: { row: any }) => (
                <CustomActionColumn
                    row={row}
                    onDelete={() => handleOrderVoid(row.original._id)}
                />
            ),
        },
    ], [currentPage, pageSize]);

    return (
        <>
            <div className="main-page-content">
                <CustomHeader
                    title="Order Management"
                    rightActions={
                        <button
                        type="button"
                        className="custom-btn-secondary w-auto"
                        onClick={() => CreateUpdateOrderDialog.show(false, null, () => refreshData())}>
                        Create Order</button>
                      }
                      register={register}
                      setValue={setValue}
                />

                <div className="d-flex gap-2">
                    {statuses.map(([key, status]) => (
                        <Button
                            key={key}
                            className={selectedStatus === key ? "custom-btn-primary" : "custom-btn-secondary"}
                            onClick={() => handleStatusClick(key)}>
                            {status.label}
                        </Button>
                    ))}
                </div>
   
                    <CustomUtilityBox
                        title="Orders"
                        searchHint={"Search name, ID, Description etc."}
                        onDownloadClick={async () => {
                            await exportData(ApiPaths.EXPORT_ORDER, { order_status: selectedStatus })
                        }}
                        onSortClick={(value) => {
                            handleFilterChange({
                                sort: value,
                                status: selectedStatus.toString(),
                            })
                        }}
                        onMoreClick={() => { }}
                        onSearch={(value) => handleFilterChange({ keyword: value })}
                    />

                <CustomTable
                    columns={orderColumns}
                    data={orderList}
                    pageSize={pageSize}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page: number) => setCurrentPage(page)}
                    onLimitChange={(pageSize: number) => {
                        setPageSize(pageSize);
                        setCurrentPage(1);
                    }}
                    theadClass="table-light"
                />

            </div>
        </>
    );
}

export default OrderManagement;