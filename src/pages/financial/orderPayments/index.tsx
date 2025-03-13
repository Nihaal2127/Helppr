import React, { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import CustomHeader from "../../../components/CustomHeader";
import CustomUtilityBox from "../../../components/CustomUtilityBox";
import { textUnderlineCell, formatDate } from "../../../helper/utility";
import CustomTable from "../../../components/CustomTable";
import { fetchUser } from "../../../services/userService";
import { getCount } from "../../../services/getCountService";
import { UserModel } from "../../../models/UserModel";
import UserDetailsDialog from "../../userManagement/UserDetailsDialog";

const OrderPayments = () => {
    const { register } = useForm();
    const statuses: [number, { label: string }][] = [
        [1, { label: "Received" }],
        [2, { label: "Pending" }]
    ];
    const [selectedStatus, setSelectedStatus] = useState(statuses[0][0]);
    const [userData, setUserData] = useState<{}>({});
    const [userList, setUserList] = useState<UserModel[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const fetchRef = useRef(false);

    const fetchData = useCallback(async (filters: {
        keyword?: string;
        status?: string
    }) => {
        if (fetchRef.current) return;
        fetchRef.current = true;
        const { responseCount, countModel } = await getCount(3);
        if (responseCount && countModel) {
            setUserData({ Total: countModel.total_user, Active: countModel.active_user, Inactive: countModel.inactive_user });
        }
        const { response, users, totalPages } = await fetchUser(false, 2, currentPage, pageSize, { ...filters, });
        if (response) {
            setUserList(users);
            setTotalPages(totalPages);
        }
        fetchRef.current = false;
    }, [currentPage, pageSize]);

    useEffect(() => {
        fetchData({});
    }, []);


    const handleStatusClick = async (statusKey: number) => {
        setSelectedStatus(statusKey);
        await handleFilterChange({ status: statusKey.toString() });
    };

    const handleFilterChange = async (filters: {
        keyword?: string;
        status?: string
    }) => {
        setCurrentPage(1);
        setTotalPages(0);
        if (Object.keys(filters).length === 0) {
            fetchRef.current = false;
        } else {
            await fetchData(filters);
        }
    };

    const userShow = (userId: string) => {
        UserDetailsDialog.show(userId, () => fetchData({}))
    }

    const orderPaymentsColumns = React.useMemo(() => [
        {
            Header: "SR No",
            accessor: "serial_no",
            Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
        },
        {
            Header: "Order ID", accessor: "order_id",
            Cell: textUnderlineCell("order_id", (row) => userShow(row._id)),
        },
        { Header: "Partner ID", accessor: "partner_id" },
        { Header: "User ID", accessor: "user_id" },
        {
            Header: "Order Date",
            accessor: "order_date",
            Cell: ({ row }) => formatDate(row.original.order_date ? row.original.order_date : "")
        },
        { Header: "Total Amount", accessor: "total_amount" },
        { Header: "Location", accessor: "city_name" },
        { Header: "Payment Mode", accessor: "payment_mode" },
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
                                500
                            </span>
                        </div>
                    ))}
                </div>

                <CustomUtilityBox
                    title="Order Payments"
                    searchHint={"Search name, ID, Description etc."}
                    onDownloadClick={() => { }}
                    onSortClick={() => { }}
                    onMoreClick={() => { }}
                    onSearch={(value) => handleFilterChange({ keyword: value })}
                    register={register}
                />

                <CustomTable
                    columns={orderPaymentsColumns}
                    data={userList}
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