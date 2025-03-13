import React, { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import CustomHeader from "../../components/CustomHeader";
import CustomSummaryBox from "../../components/CustomSummaryBox";
import CustomUtilityBox from "../../components/CustomUtilityBox";
import { capitalizeString, textUnderlineCell, statusCell, showLog, verificationStatusCell, formatDate } from "../../helper/utility";
import CustomTable from "../../components/CustomTable";
import AddEditUserDialog from "./AddEditUserDialog";
import { fetchUser } from "../../services/userService";
import { getCount } from "../../services/getCountService";
import { UserModel } from "../../models/UserModel";
import UserDetailsDialog from "./UserDetailsDialog";
import VerificationDetailsDialog  from "./VerificationDetailsDialog";
import PartnerDetailsDialog from "./PartnerDetailsDialog";

const UserManagement = () => {
    const { register } = useForm();
    const [selectedBox, setSelectedBox] = useState<string>("box-user");
    const [userData, setUserData] = useState<{}>({});
    const [partnerData, setParnterData] = useState<{}>({});
    const [verificationData, setVerificationData] = useState<{}>({});
    const [userList, setUserList] = useState<UserModel[]>([]);
    const [verificationList, setVerificationList] = useState<UserModel[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const fetchRef = useRef(false);

    const fetchData = useCallback(async (selected: string, filters: {
        keyword?: string;
        status?: string
    }) => {
        if (fetchRef.current) return;
        fetchRef.current = true;
        const { responseCount, countModel } = await getCount(3);
        if (responseCount && countModel) {
            setUserData({ Total: countModel.total_user, Active: countModel.active_user, Inactive: countModel.inactive_user });
            setParnterData({ Total: countModel.total_partner, Active: countModel.active_partner, Inactive: countModel.inactive_partner });
            setVerificationData({ Total: countModel.total_document, Pending: countModel.pending_document, Verified: countModel.verified_document, Rejected: countModel.reject_document });
        }
        if (selected === "box-verification") {
            const { response, users, totalPages } = await fetchUser(true, 2, currentPage, pageSize, { ...filters, });
            if (response) {
                setVerificationList(users);
                setTotalPages(totalPages);
            }
        } else {
            const { response, users, totalPages } = await fetchUser(false, selected === "box-user" ? 4 : 2, currentPage, pageSize, { ...filters, });
            if (response) {
                setUserList(users);
                setTotalPages(totalPages);
            }
        }
        fetchRef.current = false;
    }, [currentPage, pageSize]);

    useEffect(() => {
        refreshData(selectedBox);
    }, [selectedBox, pageSize, currentPage]);

    const refreshData = async (selected: string) => {
        await fetchData(selected, {});
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
            await fetchData(selectedBox, filters);
        }
    };

    const partnerShow = (userId: string) => {
        PartnerDetailsDialog.show(userId, () => refreshData("box-partner"))
    }

    const userShow = (userId: string) => {
        UserDetailsDialog.show(userId, () => refreshData("box-user"))
    }

    const verificationShow = (userId: string) => {
        VerificationDetailsDialog.show(userId, () => refreshData("box-verification"))
    }

    const userColumns = React.useMemo(() => [
        {
            Header: "SR No",
            accessor: "serial_no",
            Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
        },
        {
            Header: "User ID", accessor: "user_id",
            Cell: textUnderlineCell("user_id", (row) => userShow(row._id)),
        },
        {
            Header: "User Name", accessor: "name",
            Cell: textUnderlineCell("name", (row) => userShow(row._id)),
        },
        { Header: "Service Taken", accessor: "total_service" },
        { Header: "Service Paid", accessor: "service_paid" },
        { Header: "Service Unpaid", accessor: "service_unpaid" },
        { Header: "Total Amount", accessor: "total_amount" },
        { Header: "Balance Amount", accessor: "balance_amount" },
        {
            Header: "Status", accessor: "is_active",
            Cell: statusCell("is_active"),
        },
    ], [currentPage, pageSize]);

    const partnerColumns = React.useMemo(() => [
        {
            Header: "SR No",
            accessor: "serial_no",
            Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
        },
        {
            Header: "Partner ID", accessor: "user_id",
            Cell: textUnderlineCell("user_id", (row) => partnerShow(row._id)),
        },
        {
            Header: "Partner Name", accessor: "name",
            Cell: textUnderlineCell("name", (row) => partnerShow(row._id)),
        },
        { Header: "No. of services", accessor: "no_of_services" },
        { Header: "Service Provided", accessor: "completed_service" },
        { Header: "Total Earnings", accessor: "total_earnings" },
        { Header: "Bal Payment", accessor: "bal_payment" },
        { Header: "Rating", accessor: "rating" },
        {
            Header: "Status", accessor: "is_active",
            Cell: statusCell("is_active"),
        },
    ], [currentPage, pageSize]);

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
    ], [currentPage, pageSize]);

    return (
        <>
            <div className="main-page-content">
                <CustomHeader
                    title="User Management"
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
                                handleFilterChange({});
                            }}
                            isSelected={selectedBox === id}
                            onFilterChange={(filter) => {
                                handleFilterChange(filter);
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
                    title={
                        selectedBox === "box-user" ? "Users" : selectedBox === "box-partner" ? "Partners" : "Verifications"
                    }
                    searchHint={"Search name, ID, Description etc."}
                    onDownloadClick={() => { }}
                    onSortClick={() => { }}
                    onMoreClick={() => { }}
                    onSearch={(value) => handleFilterChange({ keyword: value })}
                    register={register}
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
                    theadClass="table-light"
                />

            </div>
        </>
    );
}

export default UserManagement;