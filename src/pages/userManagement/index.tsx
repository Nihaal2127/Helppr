import React, { useState, useEffect, useCallback, useRef } from "react";
import CustomHeader from "../../components/CustomHeader";
import CustomSummaryBox from "../../components/CustomSummaryBox";
import CustomUtilityBox from "../../components/CustomUtilityBox";
import { capitalizeString, textUnderlineCell, statusCell, verificationStatusCell, formatDate, priceCell } from "../../helper/utility";
import CustomTable from "../../components/CustomTable";
import AddEditUserDialog from "./AddEditUserDialog";
import { deleteUser, fetchUser } from "../../services/userService";
import { getCount } from "../../services/getCountService";
import { UserModel } from "../../models/UserModel";
import UserDetailsDialog from "./UserDetailsDialog";
import VerificationDetailsDialog from "./VerificationDetailsDialog";
import PartnerDetailsDialog from "./PartnerDetailsDialog";
import { exportData } from "../../services/exportService";
import { ApiPaths } from "../../remote/apiPaths";
import CustomActionColumn from "../../components/CustomActionColumn";
import { openConfirmDialog } from "../../components/CustomConfirmDialog";
import { useForm } from "react-hook-form";
import type { ServerTableSortBy } from "../../helper/serverTableSort";

const UserManagement = () => {
    const [selectedBox, setSelectedBox] = useState<string>("box-user");
    const [userData, setUserData] = useState<{}>({});
    const [partnerData, setParnterData] = useState<{}>({});
    const [verificationData, setVerificationData] = useState<{}>({});
    const [userList, setUserList] = useState<UserModel[]>([]);
    const [verificationList, setVerificationList] = useState<UserModel[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [utilitySearchKey, setUtilitySearchKey] = useState(0);
    const [searchKeyword, setSearchKeyword] = useState("");
    const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
    const [sortBy, setSortBy] = useState<ServerTableSortBy>([]);
    const fetchRef = useRef(false);
    const { register, setValue } = useForm();
    const fetchData = useCallback(async () => {
        if (fetchRef.current) return;
        fetchRef.current = true;
        try {
            const { responseCount, countModel } = await getCount(3);
            if (responseCount && countModel) {
                setUserData({ Total: countModel.total_user, Active: countModel.active_user, Inactive: countModel.inactive_user, Blocked: countModel.blocked_user });
                setParnterData({ Total: countModel.total_partner, Active: countModel.active_partner, Inactive: countModel.inactive_partner, Blocked: countModel.blocked_partner });
                setVerificationData({
                    Total: countModel.total_document,
                    Pending: countModel.pending_document,
                });
            }

            const filters = {
                keyword: searchKeyword || undefined,
                status: statusFilter,
            };
            const selectedSortBy = selectedBox === "box-verification" ? [] : sortBy;

            if (selectedBox === "box-verification") {
                const { response, users, totalPages } = await fetchUser(true, 2, currentPage, pageSize, filters, selectedSortBy);
                if (response) {
                    setVerificationList(users);
                    setTotalPages(totalPages);
                } else {
                    setVerificationList([]);
                    setTotalPages(0);
                }
            } else {
                const { response, users, totalPages } = await fetchUser(false, selectedBox === "box-user" ? 4 : 2, currentPage, pageSize, filters, selectedSortBy);
                if (response) {
                    setUserList(users);
                    setTotalPages(totalPages);
                } else {
                    setUserList([]);
                    setTotalPages(0);
                }
            }
        } finally {
            fetchRef.current = false;
        }
    }, [currentPage, pageSize, searchKeyword, selectedBox, sortBy, statusFilter]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const refreshData = useCallback(async (_selected: string) => {
        await fetchData();
    }, [fetchData]);

    const handleSortChange = useCallback((next: { id: string; desc: boolean }[]) => {
        setSortBy(next);
        setCurrentPage(1);
    }, []);

    const partnerShow = useCallback(
        (userId: string) => {
            PartnerDetailsDialog.show(userId, () => {
                void refreshData("box-partner");
            });
        },
        [refreshData]
    );
                                                                           
    const userShow = useCallback(
        (userId: string) => {
            UserDetailsDialog.show(userId, () => {
                void refreshData("box-user");
            });
        },
        [refreshData]
    );

    const verificationShow = useCallback(
        (userId: string) => {
            VerificationDetailsDialog.show(userId, () => {
                void refreshData("box-verification");
            });
        },
        [refreshData]
    );

    const handleUserDelete = useCallback(
        (id: string, selected: "box-user" | "box-partner") => {
            openConfirmDialog(
                "Are you sure you want to void this user? ",
                "Void",
                "Cancel",
                async () => {
                    const response = await deleteUser(id);
                    if (response) {
                        void refreshData(selected);
                    }
                }
            );
        },
        [refreshData]
    );

    const userColumns = React.useMemo(() => [
        {
            Header: "SR No",
            accessor: "serial_no",
            Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
        },
        // {
        //     Header: "User ID", accessor: "user_id",
        //     sort: true,
        //     Cell: textUnderlineCell("user_id", (row) => userShow(row._id)),
        // },
        {
            Header: "User Name", accessor: "name",
            sort: true,
        },
        { Header: "Service Taken", accessor: "total_service" },
        // { Header: "Service Paid", accessor: "service_paid" },
        // { Header: "Service Unpaid", accessor: "service_unpaid" },
        {
            Header: "Total Amount", accessor: "total_amount",
            Cell: priceCell("total_amount"),
        },
        {
            Header: "Paid Amount", accessor: "paid_amount",
            Cell: priceCell("paid_amount"),
        },
        {
            Header: "Balance Amount", accessor: "balance_amount",
            Cell: priceCell("balance_amount"),
        },
        {
            Header: "Status", accessor: "is_active",
            Cell: statusCell("is_active"),
        },
        {
            Header: "Action",
            accessor: "action",
            Cell: ({ row }: { row: any }) => (
                <CustomActionColumn
                    row={row}
                    onView={() => userShow(row.original._id)}
                    onDelete={() => handleUserDelete(row.original._id, "box-user")}
                />
            ),
        },
    ], [currentPage, pageSize, handleUserDelete, userShow]);

    const partnerColumns = React.useMemo(() => [
        {
            Header: "SR No",
            accessor: "serial_no",
            Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
        },
        // {
        //     Header: "Partner ID", accessor: "user_id",
        //     sort: true,
        //     Cell: textUnderlineCell("user_id", (row) => partnerShow(row._id)),
        // },
        {
            Header: "Partner Name", accessor: "name",
            sort: true,
        },
        { Header: "No. of services", accessor: "no_of_services" },
        // { Header: "Service Provided", accessor: "completed_service" },
        {
            Header: "Total Earnings", accessor: "total_earnings",
            Cell: priceCell("total_earnings"),
        },
        {
            Header: "Bal Payment", accessor: "bal_payment",
            Cell: priceCell("bal_payment"),
        },
        { Header: "Rating", accessor: "rating" },
        {
            Header: "Status", accessor: "is_active",
            Cell: statusCell("is_active"),
        },
        {
            Header: "Action",
            accessor: "action",
            Cell: ({ row }: { row: any }) => (
                <CustomActionColumn
                    row={row}
                    onView={() => partnerShow(row.original._id)}
                    onDelete={() => handleUserDelete(row.original._id, "box-partner")}
                />
            ),
        },
    ], [currentPage, pageSize, handleUserDelete, partnerShow]);

    const verificationColumns = React.useMemo(() => [
        {
            Header: "SR No",
            accessor: "serial_no",
            Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
        },
        {
            Header: "Registration ID", accessor: "registration_id",
            Cell: textUnderlineCell("registration_id", (row) => verificationShow(row._id)),
        },
        {
            Header: "Verification ID",
            accessor: "verification_id",
            Cell: ({ row }) => row.original.verification_id || "-----"
        },
        { Header: "Submitted Name", accessor: "name" },
        {
            Header: "Submitted Date",
            accessor: "submitted_at",
            Cell: ({ row }) => formatDate(row.original.submitted_at ? row.original.submitted_at : "")
        },
        { Header: "Documents Uploaded", accessor: "document_uploaded_count" },
        { Header: "Location", accessor: "city_name" },
        {
            Header: "Verified Date",
            accessor: "verified_at",
            Cell: ({ row }) => formatDate(row.original.verified_at ? row.original.verified_at : "")
        },
        {
            Header: "Status", accessor: "verification_status",
            Cell: verificationStatusCell("verification_status"),
        },
    ], [currentPage, pageSize, verificationShow]);

    return (
        <>
            <div className="main-page-content">
                <CustomHeader
                    title="User Management"
                    register={register}
                    setValue={setValue}
                />

                <div className="box-container">
                    {["box-user", "box-partner", "box-verification"].map((id) => (
                        <CustomSummaryBox
                            key={id}
                            divId={id}
                            title={capitalizeString(id.replace("box-", "").replace("-", " "))}
                            data={id === "box-user" ? userData : id === "box-partner" ? partnerData : verificationData}
                            onSelect={(divId) => {
                                setSelectedBox(divId);
                                setCurrentPage(1);
                                setSearchKeyword("");
                                setStatusFilter(undefined);
                                setSortBy([]);
                                setUtilitySearchKey((k) => k + 1);
                            }}
                            isSelected={selectedBox === id}
                            onFilterChange={(filter) => {
                                setStatusFilter(filter.status);
                                setCurrentPage(1);
                            }}
                            isAddShow={id === "box-verification" ? false : true}
                            addButtonLable={capitalizeString(id.replace("box-", "Add ").replace("-", " "))}
                            onAddClick={() => {
                                id === "box-user"
                                    ? AddEditUserDialog.show(4, false, null, () => refreshData(selectedBox))
                                    : AddEditUserDialog.show(2, false, null, () => refreshData(selectedBox))
                            }}
                        />
                    ))}
                </div>

                <CustomUtilityBox
                    key={utilitySearchKey}
                    title={
                        selectedBox === "box-user" ? "Users" : selectedBox === "box-partner" ? "Partners" : "Verifications"
                    }
                    searchHint={"Search name, ID, Description etc."}
                    onDownloadClick={async () => {
                        selectedBox === "box-user" ? await exportData(ApiPaths.EXPORT_USER)
                            : selectedBox === "box-partner" ? await exportData(ApiPaths.EXPORT_PARTNER)
                                : await exportData(ApiPaths.EXPORT_VERIFICATION_USER)
                    }}
                    onSortClick={() => { }}
                    onMoreClick={() => { }}
                    onSearch={(value) => {
                        setSearchKeyword(value);
                        setCurrentPage(1);
                    }}
                />

                <CustomTable
                    columns={selectedBox === "box-verification" ? verificationColumns : selectedBox === "box-user" ? userColumns : partnerColumns}
                    data={selectedBox === "box-verification" ? verificationList : userList}
                    pageSize={pageSize}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page: number) => setCurrentPage(page)}
                    onLimitChange={(pageSize: number) => {
                        setPageSize(pageSize);
                        setCurrentPage(1);
                    }}
                    manualSortBy={selectedBox === "box-user" || selectedBox === "box-partner"}
                    sortBy={sortBy}
                    onSortChange={handleSortChange}
                    theadClass="table-light"
                />

            </div>
        </>
    );
}

export default UserManagement;