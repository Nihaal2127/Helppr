import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import CustomHeader from "../../../components/CustomHeader";
import CustomUtilityBox from "../../../components/CustomUtilityBox";
import { formatUtcToLocalTime, formatDate, priceCell, textUnderlineCell } from "../../../helper/utility";
import CustomTable from "../../../components/CustomTable";
import { fetchFinancial } from "../../../services/financialService";
import { getCount } from "../../../services/getCountService";
import { FinancialModel } from "../../../models/FinancialModel";
import { PaymentEnum } from "../../../constant/PaymentEnum";
import OrderInfoDialog from "../../orderManagement/OrderInfoDialog";
import UserDetailsDialog from "../../userManagement/UserDetailsDialog";
import { ROUTES } from "../../../routes/Routes";
import { exportData } from "../../../services/exportService";
import { ApiPaths } from "../../../remote/apiPaths";

const OrderPayments = () => {
    const navigate = useNavigate();
    const statuses: [number, { label: string }][] = [
        [1, { label: "Received" }],
        [2, { label: "Pending" }]
    ];
    const [selectedStatus, setSelectedStatus] = useState(statuses[0][0]);
    const [userData, setUserData] = useState<{ Received?: number; Pending?: number }>({});
    const [financialList, setFinancialList] = useState<FinancialModel[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const fetchRef = useRef(false);

    const fetchData = useCallback(async (filters: {
        keyword?: string;
        is_paid?: string
        service_status?: string;
    }) => {
        if (fetchRef.current) return;
        fetchRef.current = true;
        filters.service_status = "3";
        const { responseCount, countModel } = await getCount(4);
        if (responseCount && countModel) {
            setUserData({ Received: countModel.received_amount, Pending: countModel.pending_amount });
        }
        const { response, financials, totalPages } = await fetchFinancial(currentPage, pageSize, { ...filters, });
        if (response) {
            setFinancialList(financials);
            setTotalPages(totalPages);
        }
        fetchRef.current = false;
    }, [currentPage, pageSize]);

    useEffect(() => {
        fetchData({ is_paid: "true" });
    }, []);

    const handleStatusClick = async (statusKey: number) => {
        setSelectedStatus(statusKey);

        await handleFilterChange({ is_paid: statusKey === 1 ? "true" : "false" });
    };

    const handleFilterChange = async (filters: {
        keyword?: string;
        is_paid?: string
    }) => {
        setCurrentPage(1);
        setTotalPages(0);
        if (Object.keys(filters).length === 0) {
            fetchRef.current = false;
        } else {
            await fetchData(filters);
        }
    };

    const financialColumns = React.useMemo(() => [
        {
            Header: "SR No",
            accessor: "serial_no",
            Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
        },
        {
            Header: "Order ID", accessor: "order_unique_id",
            Cell: textUnderlineCell("order_unique_id", (row) => { OrderInfoDialog.show(row.order_id, () => { }) }),
        },
        {
            Header: "Partner ID", accessor: "partner_unique_id",
            Cell: textUnderlineCell("partner_unique_id", (row) => { navigate(`${ROUTES.PARTNER_PAYOUT_SHOW.path}?id=${row.partner_id}`) }),
        },
        {
            Header: "User ID", accessor: "user_unique_id",
            Cell: textUnderlineCell("user_unique_id", (row) => { UserDetailsDialog.show(row.user_id, () => { }) }),
        },
        { Header: "Service Name", accessor: "service_name" },
        {
            Header: "Service Date",
            accessor: "service_date",
            Cell: ({ row }) => formatDate(row.original.service_date ? row.original.service_date : "")
        },
        {
            Header: "From Time",
            accessor: "service_from_time",
            Cell: ({ row }) => formatUtcToLocalTime(row.original.service_from_time ? row.original.service_from_time : "")
        },
        {
            Header: "To Time",
            accessor: "service_to_time",
            Cell: ({ row }) => formatUtcToLocalTime(row.original.service_to_time ? row.original.service_to_time : "")
        },
        {
            Header: "Total Price", accessor: "total_price",
            Cell: priceCell("total_price"),
        },
        {
            Header: "Payment Mode",
            accessor: "payment_mode_id",
            Cell: ({ row }) => PaymentEnum.get(Number(row.original.payment_mode_id))?.label || "-",
        },
    ], [currentPage, pageSize]);

    return (
        <>
            <div className="main-page-content">
                <CustomHeader
                    title="Financial - Order Payments"
                />

                <div className="d-flex gap-2" style={{ width: "100%" }}>
                    {statuses.map(([key, status]: [number, { label: string }]) => (
                        <div
                            className="custom-box-count"
                            key={key}
                            style={{
                                borderColor: selectedStatus === key ? "var(--lb-active-border)" : "var(--lb-border)",
                            }}
                            onClick={() => handleStatusClick(key)}
                        >
                            <div className={`box-rw-clr${key + 1}`} style={{ textDecoration: "none" }}>
                                {status.label}
                            </div>
                            <span className="custom-box-count-span mt-2">
                                {key === 1 ? userData.Received ?? 0 : userData.Pending ?? 0}
                            </span>
                        </div>
                    ))}
                </div>

                <CustomUtilityBox
                    title="Order Payments"
                    searchHint={"Search name, ID, Description etc."}
                    onDownloadClick={async () => {
                       await exportData(ApiPaths.EXPORT_FINANCIAL())
                    }}
                    onSortClick={() => { }}
                    onMoreClick={() => { }}
                    onSearch={(value) => handleFilterChange({ keyword: value })}
                />

                <CustomTable
                    columns={financialColumns}
                    data={financialList}
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

export default OrderPayments;