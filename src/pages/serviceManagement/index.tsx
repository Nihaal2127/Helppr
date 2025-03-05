import React, { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import CustomHeader from "../../components/CustomHeader";
import CustomSummaryBox from "../../components/CustomSummaryBox";
import CustomUtilityBox from "../../components/CustomUtilityBox";
import { capitalizeString, statusCell } from "../../helper/utility";
import CustomTable from "../../components/CustomTable";
import AddEditCategoryDialog from "./AddEditCategoryDialog";
import AddEditServiceDialog from "./AddEditServiceDialog";
import { CategoryModel } from "../../models/CategoryModel";
import { ServiceModel } from "../../models/ServiceModel";
import { fetchCategory, deleteCategory } from "../../services/categoryService";
import { deleteService, fetchService } from "../../services/servicesService";
import CustomActionColumn from "../../components/CustomActionColumn";
import { openConfirmDialog } from "../../components/CustomConfirmDialog";
import { getCount } from "../../services/getCountService";

const ServiceManagement = () => {
    const { register } = useForm();
    const [selectedBox, setSelectedBox] = useState<string>("box-category");
    const [categoryData, setCategoryData] = useState<{}>({});
    const [serviceData, setServiceData] = useState<{}>({});
    const [categoryList, setCategoryList] = useState<CategoryModel[]>([]);
    const [serviceList, setServiceList] = useState<ServiceModel[]>([]);
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
        const { response, countModel } = await getCount(2);
        if (response && countModel) {
            setCategoryData({ Total: countModel.total_category, Active: countModel.active_category, Inactive: countModel.inactive_category });
            setServiceData({ Total: countModel.total_service, Active: countModel.active_service, Inactive: countModel.inactive_service });
        }
        if (selected === "box-category") {
            const { response, categories, totalPages } = await fetchCategory(currentPage, pageSize, { ...filters, });
            if (response) {
                setCategoryList(categories);
                setTotalPages(totalPages);
            }
        } else if (selected === "box-service") {
            const { response, services, totalPages } = await fetchService(currentPage, pageSize, { ...filters, });
            if (response) {
                setServiceList(services);
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

    const categoryColumns = React.useMemo(() => [
        {
            Header: "SR No",
            accessor: "serial_no",
            Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
        },
        { Header: "Category ID", accessor: "category_id" },
        { Header: "Category Name", accessor: "name" },
        { Header: "Description", accessor: "desc" },
        { Header: "Services", accessor: "services" },
        { Header: "Helpers", accessor: "helpers" },
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
                            AddEditCategoryDialog.show(true, row.original, () => refreshData("box-category"))
                        }
                    }
                    onDelete={async () => {
                        openConfirmDialog(
                            "Are you sure you want to delete? ",
                            "Delete",
                            "Cancle",
                            async () => {
                                let response = await deleteCategory(row.original._id);
                                if (response) {
                                    refreshData("box-category");
                                }
                            });
                    }}
                />
            ),
        },
    ], [currentPage, pageSize]);

    const serviceColumns = React.useMemo(() => [
        {
            Header: "SR No",
            accessor: "serial_no",
            Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
        },
        { Header: "Service ID", accessor: "service_id" },
        { Header: "Service Name", accessor: "name" },
        { Header: "Description", accessor: "desc" },
        { Header: "Category", accessor: "category_name" },
        { Header: "Price", accessor: "price" },
        { Header: "Helpers", accessor: "helpers" },
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
                            AddEditServiceDialog.show(true, row.original, () => refreshData("box-service"))
                        }
                    }
                    onDelete={async () => {
                        openConfirmDialog(
                            "Are you sure you want to delete? ",
                            "Delete",
                            "Cancle",
                            async () => {
                                let response = await deleteService(row.original._id);
                                if (response) {
                                    refreshData("box-service");
                                }
                            });
                    }}
                />
            ),
        },
    ], [currentPage, pageSize]);

    return (
        <>
            <div className="main-page-content">
                <CustomHeader
                    title="Service Management"
                />

                <div className="box-container">
                    {["box-category", "box-service"].map((id) => (
                        <CustomSummaryBox
                            key={id}
                            divId={id}
                            title={capitalizeString(id.replace("box-", "").replace("-", " "))}
                            data={id === "box-category" ? categoryData : serviceData}
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
                                id === "box-category"
                                    ? AddEditCategoryDialog.show(false, null, () => refreshData(selectedBox))
                                    : AddEditServiceDialog.show(false, null, () => refreshData(selectedBox));
                            }}
                        />
                    ))}
                </div>

                <CustomUtilityBox
                    title={
                        selectedBox === "box-category" ? "Categories" : "Services"
                    }
                    searchHint={`${selectedBox === "box-category" ? "Search Category name, ID, Description etc." : "Search Service name, ID, Description etc."}`}
                    onDownloadClick={() => { }}
                    onSortClick={() => { }}
                    onMoreClick={() => { }}
                    onSearch={(value) => handleFilterChange({ keyword: value })}
                    register={register}
                />

                <CustomTable
                    columns={selectedBox === "box-category" ? categoryColumns : serviceColumns}
                    data={selectedBox === "box-category" ? categoryList : serviceList}
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

export default ServiceManagement;