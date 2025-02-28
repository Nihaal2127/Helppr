import React, { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import CustomHeader from "../../components/CustomHeader";
import CustomSummaryBox from "../../components/CustomSummaryBox";
import CustomUtilityBox from "../../components/CustomUtilityBox";
import { capitalizeString, textUnderlineCell, statusCell } from "../../helper/utility";
import CustomTable from "../../components/CustomTable";
import AddEditUserDialog from "./AddEditUserDialog";
import AddPartnerDialog from "./AddPartnerDialog";
import AddEditServiceDialog from "./AddEditServiceDialog";
import { ServiceModel } from "../../models/ServiceModel";
import { fetchUser } from "../../services/userService";
import { fetchVerification } from "../../services/documentUploadService";
import { getCount } from "../../services/getCountService";
import { UserModel } from "../../models/UserModel";
import { VerificationModel } from "../../models/VerificationModel";
import UserDetailsDialog from "./UserDetailsDialog";

const UserManagement = () => {
    const { register } = useForm();
    const [selectedBox, setSelectedBox] = useState<string>("box-user");
    const [userData, setUserData] = useState<{}>({});
    const [partnerData, setParnterData] = useState<{}>({});
    const [verificationData, setVerificationData] = useState<{}>({});
    const [userList, setUserList] = useState<UserModel[]>([]);
    const [serviceList, setServiceList] = useState<VerificationModel[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const fetchRef = useRef(false);

    const fetchData = useCallback(async (selected: string, filters: {
        name?: string;
        status?: string
    }) => {
        if (fetchRef.current) return;
        fetchRef.current = true;
        const { response, countModel } = await getCount(3);
        if (response && countModel) {
            setUserData({ Total: countModel.total_user, Active: countModel.active_user, Inactive: countModel.inactive_user });
            setParnterData({ Total: countModel.total_partner, Active: countModel.active_partner, Inactive: countModel.inactive_partner });
            setUserData({ Total: countModel.total_employee, Active: countModel.active_employee, Inactive: countModel.inactive_employee });
            setVerificationData({ Total: countModel.total_document, Pending: countModel.pending_document, Verified: countModel.verified_document, Rejected: countModel.reject_document });
        }
        if (selected === "box-verification") {
            const { response, verifications, totalPages } = await fetchVerification(currentPage, pageSize, { ...filters, });
            if (response) {
                setServiceList(verifications);
                setTotalPages(totalPages);
            }
        } else {
            const { response, users, totalPages } = await fetchUser(selected === "box-user" ? 4 : 2, currentPage, pageSize, { ...filters, });
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
        name?: string;
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

    const partnerShow = () => {

    }

    const userShow = () => {
        UserDetailsDialog.show(() => refreshData(selectedBox))
    }

    const userColumns = React.useMemo(() => [
        {
            Header: "SR No",
            accessor: "serial_no",
            Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
        },
        {
            Header: "User ID", accessor: "user_id",
            Cell: textUnderlineCell("user_id", userShow),
        },
        {
            Header: "User Name", accessor: "name",
            Cell: textUnderlineCell("name", userShow),
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
            Cell: textUnderlineCell("user_id", partnerShow),
        },
        {
            Header: "Partner Name", accessor: "name",
            Cell: textUnderlineCell("name", partnerShow),
        },
        { Header: "No. of services", accessor: "no_of_services" },
        { Header: "Service Provided", accessor: "service_provided" },
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
        { Header: "Registration ID", accessor: "registration_id" },
        { Header: "Verification ID", accessor: "verification_id" },
        { Header: "Submitted Name", accessor: "submitted_name" },
        { Header: "Submitted Date", accessor: "submitted_date" },
        { Header: "Documents Uploaded", accessor: "documents_uploaded" },
        { Header: "Location", accessor: "location" },
        { Header: "Verified Date", accessor: "verified_date" },
        {
            Header: "Status", accessor: "is_active",
            Cell: statusCell("is_active"),
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
                        />
                    ))}
                </div>

                <CustomUtilityBox
                    addButtonLable={
                        selectedBox === "box-user" ? "Add User" : selectedBox === "box-partner" ? "Add Partner" : "Add Verification"
                    }
                    searchHint={"Search name, ID, Description etc."}
                    onAddClick={() => {
                        selectedBox === "box-user"
                            ? AddEditUserDialog.show(true, false, null, () => refreshData(selectedBox))
                            : selectedBox === "box-partner"
                                ? AddPartnerDialog.show(() => refreshData(selectedBox))
                                : AddEditServiceDialog.show(false, null, () => refreshData(selectedBox));
                    }}
                    onDownloadClick={() => { }}
                    onSortClick={() => { }}
                    onMoreClick={() => { }}
                    onSearch={(value) => handleFilterChange({ name: value })}
                    register={register}
                />

                <CustomTable
                    columns={selectedBox === "box-verificationData" ? verificationColumns : selectedBox === "box-user" ? userColumns : partnerColumns}
                    data={selectedBox === "box-verificationData" ? serviceList : userList}
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