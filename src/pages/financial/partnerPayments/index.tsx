import React, { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import CustomHeader from "../../../components/CustomHeader";
import CustomUtilityBox from "../../../components/CustomUtilityBox";
import { formatDate, priceCell } from "../../../helper/utility";
import CustomTable from "../../../components/CustomTable";
import { fetchFinancial } from "../../../services/financialService";
import { getCount } from "../../../services/getCountService";
import { FinancialModel } from "../../../models/FinancialModel";

const PartnerPayments = () => {
    const { register } = useForm();
    const statuses: [number, { value: number, label: string }][] = [
        [1, { value: 2, label: "Pending" }],
        [2, { value: 1, label: "Completed" }],
        [3, { value: 3, label: "Returned" }]
    ];
    const [selectedStatus, setSelectedStatus] = useState(statuses[0][0]);
    const [userData, setUserData] = useState<{ completed_amount?: number; pending_amount?: number; returned_amount?: number }>({});
    const [financialList, setFinancialList] = useState<FinancialModel[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const fetchRef = useRef(false);

    const fetchData = useCallback(async (filters: {
        keyword?: string;
        partner_paid_status?: string;
        service_status?: string;
    }) => {
        if (fetchRef.current) return;
        fetchRef.current = true;
        filters.service_status = "3";
        const { responseCount, countModel } = await getCount(5);
        if (responseCount && countModel) {
            setUserData({ completed_amount: countModel.completed_amount, pending_amount: countModel.pending_amount, returned_amount: countModel.returned_amount });
        }
        const { response, financials, totalPages } = await fetchFinancial(currentPage, pageSize, { ...filters, });
        if (response) {
            setFinancialList(financials);
            setTotalPages(totalPages);
        }
        fetchRef.current = false;
    }, [currentPage, pageSize]);

    useEffect(() => {
        fetchData({ partner_paid_status: "1" });
    }, []);

    const handleStatusClick = async (statusKey: number) => {
        setSelectedStatus(statusKey);
        await handleFilterChange({ partner_paid_status: statusKey.toString() });
    };

    const handleFilterChange = async (filters: {
        keyword?: string;
        partner_paid_status?: string;
        service_status?: string;
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
        { Header: "Order ID", accessor: "order_unique_id" },
        { Header: "Partner ID", accessor: "partner_unique_id" },
        { Header: "Service Name", accessor: "service_name" },
        {
            Header: "Service Date",
            accessor: "service_date",
            Cell: ({ row }) => formatDate(row.original.service_date ? row.original.service_date : "")
        },
        {
            Header: "Total Amount", accessor: "total_price",
            Cell: priceCell("total_price"),
        },
        {
            Header: "Partner Earning",
            accessor: "partner_earning",
            Cell: ({ value }: { value: number }) => <span>${value}</span>,
          },
        // {
        //     Header: "Balance Amount", accessor: "balance_amount",
        //     Cell: priceCell("balance_amount"),
        // },
        // {
        //     Header: "Paid Amount", accessor: "paid_amount",
        //     Cell: priceCell("paid_amount"),
        // },
    ], [currentPage, pageSize]);

    return (
        <>
            <div className="main-page-content">
                <CustomHeader
                    title="Financial - Partner Payments"
                />

                <div className="d-flex gap-2" style={{ width: "100%" }}>
                    {statuses.map(([key, status]: [number, { value: number, label: string }]) => (
                        <div
                            className="custom-box-count"
                            key={key}
                            style={{
                                borderColor: selectedStatus === key ? "var(--lb-active-border)" : "var(--lb-border)",
                            }}
                            onClick={() => handleStatusClick(key)}
                        >
                            <div className={`box-rw-clr${status.value + 1}`} style={{ textDecoration: "none" }}>
                                {status.label}
                            </div>
                            <span className="custom-box-count-span mt-2">
                                {key === 1 ? userData.pending_amount ?? 0 : key === 2 ? userData.completed_amount ?? 0 : userData.returned_amount ?? 0}
                            </span>
                        </div>
                    ))}
                </div>

                <CustomUtilityBox
                    title="Partner Payments"
                    searchHint={"Search name, ID, Description etc."}
                    onDownloadClick={() => { }}
                    onSortClick={() => { }}
                    onMoreClick={() => { }}
                    onSearch={(value) => handleFilterChange({ keyword: value })}
                    register={register}
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

export default PartnerPayments;