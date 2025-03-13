import React, { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import CustomHeader from "../../../components/CustomHeader";
import CustomSummaryBox from "../../../components/CustomSummaryBox";
import CustomUtilityBox from "../../../components/CustomUtilityBox";
import { capitalizeString, textUnderlineCell, statusCell, showLog, verificationStatusCell, formatDate, getRoleLabel } from "../../../helper/utility";
import CustomTable from "../../../components/CustomTable";
import AddEditUserDialog from "../../userManagement/AddEditUserDialog";
import { fetchUser, deleteUser } from "../../../services/userService";
import { getCount } from "../../../services/getCountService";
import { UserModel } from "../../../models/UserModel";
import UserDetailsDialog from "../../userManagement/UserDetailsDialog";
import EmployeeDetailsDialog from "../../userManagement/EmployeeDetailsDialog";
import PartnerDetailsDialog from "../../userManagement/PartnerDetailsDialog";
import CustomActionColumn from "../../../components/CustomActionColumn";
import { openConfirmDialog } from "../../../components/CustomConfirmDialog";

const RoleManagement = () => {
    const { register } = useForm();
    const [selectedBox, setSelectedBox] = useState<string>("box-employee");
    const [userData, setUserData] = useState<{}>({});
    const [partnerData, setParnterData] = useState<{}>({});
    const [employeeData, setEmployeeData] = useState<{}>({});
    const [userList, setUserList] = useState<UserModel[]>([]);
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
            setEmployeeData({ Total: countModel.total_employee, Active: countModel.active_employee, Inactive: countModel.inactive_employee });
        }
        if (selected === "box-employee") {
            const { response, users, totalPages } = await fetchUser(false, 3, currentPage, pageSize, { ...filters, });
            if (response) {
                setUserList(users);
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

    const employeeShow = (userId: string) => {
        EmployeeDetailsDialog.show(userId, () => refreshData("box-employee"))
    }

    const handleDeleteOnClick = (userId: string, selected: string) => {
        openConfirmDialog(
            "Are you sure you want to delete? ",
            "Delete",
            "Cancle",
            async () => {
                let response = await deleteUser(userId);
                if (response) {
                    refreshData(selected);
                }
            });
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
        {
            Header: "Role",
            accessor: "type",
            Cell: ({ row }) => getRoleLabel(row.original.type),
        },
        {
            Header: "Start Date",
            accessor: "created_at",
            Cell: ({ row }) => formatDate(row.original.created_at ? row.original.created_at : "")
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
                    onEdit={
                        () => {
                            AddEditUserDialog.show(4, true, row.original, () => refreshData("box-user"))
                        }
                    }
                    onDelete={
                        () => {
                            handleDeleteOnClick(row.original._id, "box-user")
                        }
                    }
                />
            ),
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
        {
            Header: "Role",
            accessor: "type",
            Cell: ({ row }) => getRoleLabel(row.original.type),
        },
        {
            Header: "Start Date",
            accessor: "created_at",
            Cell: ({ row }) => formatDate(row.original.created_at ? row.original.created_at : "")
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
                    onEdit={
                        () => {
                            AddEditUserDialog.show(2, true, row.original, () => refreshData("box-partner"))
                        }
                    }
                    onDelete={
                        () => {
                            handleDeleteOnClick(row.original._id, "box-partner")
                        }
                    }
                />
            ),
        },
    ], [currentPage, pageSize]);

    const employeeColumns = React.useMemo(() => [
        {
            Header: "SR No",
            accessor: "serial_no",
            Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
        },
        {
            Header: "Employee ID", accessor: "user_id",
            Cell: textUnderlineCell("user_id", (row) => employeeShow(row._id)),
        },
        {
            Header: "Employee Name", accessor: "name",
            Cell: textUnderlineCell("name", (row) => employeeShow(row._id)),
        },
        {
            Header: "Role",
            accessor: "type",
            Cell: ({ row }) => getRoleLabel(row.original.type),
        },
        {
            Header: "Start Date",
            accessor: "created_at",
            Cell: ({ row }) => formatDate(row.original.created_at ? row.original.created_at : "")
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
                    onEdit={
                        () => {
                            AddEditUserDialog.show(3, true, row.original, () => refreshData("box-employee"))
                        }
                    }
                    onDelete={
                        () => {
                            handleDeleteOnClick(row.original._id, "box-employee")
                        }
                    }
                />
            ),
        },
    ], [currentPage, pageSize]);

    return (
        <>
            <div className="main-page-content">
                <CustomHeader
                    title="Settings - Roles"
                />

                <div className="box-container">
                    {["box-employee", "box-user", "box-partner"].map((id) => (
                        <CustomSummaryBox
                            key={id}
                            divId={id}
                            title={capitalizeString(id.replace("box-", "").replace("-", " "))}
                            data={id === "box-user" ? userData : id === "box-partner" ? partnerData : employeeData}
                            onSelect={(divId) => {
                                setSelectedBox(divId);
                                handleFilterChange({});
                            }}
                            isSelected={selectedBox === id}
                            onFilterChange={(filter) => {
                                handleFilterChange(filter);
                            }}
                            isAddShow={true}
                            addButtonLable={capitalizeString(id.replace("box-", "Add ").replace("-", " "))}
                            onAddClick={() => {
                                id === "box-user"
                                    ? AddEditUserDialog.show(4, false, null, () => refreshData(selectedBox))
                                    : id === "box-partner" ? AddEditUserDialog.show(2, false, null, () => refreshData(selectedBox))
                                        : AddEditUserDialog.show(3, false, null, () => refreshData(selectedBox))
                            }}
                        />
                    ))}
                </div>

                <CustomUtilityBox
                    title={
                        selectedBox === "box-user" ? "Users" : selectedBox === "box-partner" ? "Partners" : "Employees"
                    }
                    searchHint={"Search name, ID, Description etc."}
                    onDownloadClick={() => { }}
                    onSortClick={() => { }}
                    onMoreClick={() => { }}
                    onSearch={(value) => handleFilterChange({ keyword: value })}
                    register={register}
                />

                <CustomTable
                    columns={selectedBox === "box-employee" ? employeeColumns : selectedBox === "box-user" ? userColumns : partnerColumns}
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

export default RoleManagement;