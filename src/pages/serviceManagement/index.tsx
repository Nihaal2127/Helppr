import React, { useState, useEffect, useCallback, useRef } from "react";
import CustomHeader from "../../components/CustomHeader";
import CustomSummaryBox from "../../components/CustomSummaryBox";
import CustomUtilityBox from "../../components/CustomUtilityBox";
import { capitalizeString, priceCell, statusCell, formatDate } from "../../helper/utility";
import CustomTable from "../../components/CustomTable";
import AddEditCategoryDialog from "./AddEditCategoryDialog";
import AddEditServiceDialog from "./AddEditServiceDialog";
import { CategoryModel } from "../../models/CategoryModel";
import { ServiceModel } from "../../models/ServiceModel";
import { fetchCategory, deleteCategory } from "../../services/categoryService";
import { deleteService, fetchService, fetchServiceDropDown } from "../../services/servicesService";
import CustomActionColumn from "../../components/CustomActionColumn";
import { openConfirmDialog } from "../../components/CustomConfirmDialog";
import { getCount } from "../../services/getCountService";
import { exportData } from "../../services/exportService";
import { ApiPaths } from "../../remote/apiPaths";
import { useForm } from "react-hook-form";
import type { ServerTableSortBy } from "../../helper/serverTableSort";

/* ADDED: static requested category data */
const staticRequestedCategoryList = [
    {
        _id: "1",
        request_id: "REQC001",
        name: "Drone Photography",
        desc: "Need professional drone photography services",
        createdAt: "2026-03-01",
        status: "Pending",
        is_active: false,
        state_ids: [],
        city_ids: [],
        image_url: "",
        requested_categories: "",
        services: 0,
        helpers: 0,
    },
    {
        _id: "2",
        request_id: "REQC002",
        name: "Pet Grooming",
        desc: "Home pet grooming service",
        createdAt: "2026-03-05",
        status: "Pending",
        is_active: false,
        state_ids: [],
        city_ids: [],
        image_url: "",
        requested_categories: "",
        services: 0,
        helpers: 0,
    },
];

/* ADDED: static requested service data */
const staticRequestedServiceList = [
    {
        _id: "1",
        request_id: "REQS001",
        name: "AC Repair",
        desc: "AC repair service",
        category_name: "Home",
        createdAt: "2026-03-02",
        status: "Pending",
        is_active: false,
        price: 0,
        helpers: 0,
    },
    {
        _id: "2",
        request_id: "REQS002",
        name: "Laptop Repair",
        desc: "Laptop motherboard repair",
        category_name: "Electronics",
        createdAt: "2026-03-06",
        status: "Pending",
        is_active: false,
        price: 0,
        helpers: 0,
    },
];

/* ADDED: pending status cell */
const pendingStatusCell = () => () => (
    <span style={{ color: "orange", fontWeight: 600 }}>Pending</span>
);

const ServiceManagement = () => {
    const { register, setValue } = useForm<any>();
    const [selectedBox, setSelectedBox] = useState<string>("box-category");
    const [categoryData, setCategoryData] = useState<Record<string, number>>({});
    const [serviceData, setServiceData] = useState<Record<string, number>>({});
    const [categoryList, setCategoryList] = useState<CategoryModel[]>([]);
    const [serviceList, setServiceList] = useState<ServiceModel[]>([]);

    /* ADDED: requested table states */
    const [showRequestedCategory, setShowRequestedCategory] = useState(false);
    const [showRequestedService, setShowRequestedService] = useState(false);
    const [requestedCategoryList, setRequestedCategoryList] = useState<any[]>([]);
    const [requestedServiceList, setRequestedServiceList] = useState<any[]>([]);

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const fetchRef = useRef(false);
    const [serviceIdToName, setServiceIdToName] = useState<Record<string, string>>({});
    const [serviceNameList, setServiceNameList] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<ServerTableSortBy>([]);

    useEffect(() => {
        if (selectedBox !== "box-category") return;
        let cancelled = false;
        (async () => {
            const opts = await fetchServiceDropDown();
            if (cancelled) return;
            const map: Record<string, string> = {};
            const names: string[] = [];
            opts.forEach((o) => {
                if (o.value && o.value !== "select-all") map[o.value] = o.label;
                if (o.label) names.push(o.label);
            });
            setServiceIdToName(map);
            setServiceNameList(names);
        })();
        return () => {
            cancelled = true;
        };
    }, [selectedBox]);

    const fetchData = useCallback(async (selected: string, filters: {
        keyword?: string;
        status?: string;
        sort?: string;
    }) => {
        if (fetchRef.current) return;
        fetchRef.current = true;

        try {
            const { responseCount, countModel } = await getCount(2);

            if (responseCount && countModel) {
                setCategoryData({
                    Total: countModel.total_category ?? 0,
                    Active: countModel.active_category ?? 0,
                    Inactive: countModel.inactive_category ?? 0,
                    requested_category:
                        countModel.total_requestedcategory ?? staticRequestedCategoryList.length,
                });

                setServiceData({
                    Total: countModel.total_service ?? 0,
                    Active: countModel.active_service ?? 0,
                    Inactive: countModel.inactive_service ?? 0,
                    requested_service:
                        countModel.total_requestedservice ?? staticRequestedServiceList.length,
                });
            } else {
                setCategoryData({
                    Total: 0,
                    Active: 0,
                    Inactive: 0,
                    requested_category: staticRequestedCategoryList.length,
                });

                setServiceData({
                    Total: 0,
                    Active: 0,
                    Inactive: 0,
                    requested_service: staticRequestedServiceList.length,
                });
            }

            if (selected === "box-category") {
                const { response, categories, totalPages } = await fetchCategory(currentPage, pageSize, { ...filters });
                if (response) {
                    setCategoryList(categories || []);
                    setTotalPages(totalPages || 0);
                }
            } else if (selected === "box-service") {
                const { response, services, totalPages } = await fetchService(currentPage, pageSize, { ...filters });
                if (response) {
                    setServiceList(services || []);
                    setTotalPages(totalPages || 0);
                }
            }
        } finally {
            fetchRef.current = false;
        }
    }, [currentPage, pageSize]);

    const refreshData = useCallback(async (selected: string) => {
        await fetchData(selected, {});
    }, [fetchData]);

    useEffect(() => {
        if (!showRequestedCategory && !showRequestedService) {
            void refreshData(selectedBox);
        }
    }, [selectedBox, pageSize, currentPage, showRequestedCategory, showRequestedService, refreshData]);

    const handleFilterChange = async (filters: {
        keyword?: string;
        status?: string;
        sort?: string;
    }) => {
        setCurrentPage(1);
        setTotalPages(0);
        setSortBy([]);

        /* ADDED: close requested tables when using normal filters */
        setShowRequestedCategory(false);
        setShowRequestedService(false);

        fetchRef.current = false;

        if (Object.keys(filters).length === 0) {
            await fetchData(selectedBox, {});
        } else {
            await fetchData(selectedBox, filters);
        }
    };

    /* ADDED: open requested category table */
    const openRequestedCategory = () => {
        setShowRequestedCategory(true);
        setShowRequestedService(false);
        setRequestedCategoryList(staticRequestedCategoryList);
    };

    /* ADDED: open requested service table */
    const openRequestedService = () => {
        setShowRequestedService(true);
        setShowRequestedCategory(false);
        setRequestedServiceList(staticRequestedServiceList);
    };

    const partnerCountCell = useCallback(({ row }: { row: any }) => {
        const cat = row.original;
        const countVal = cat.helpers ?? cat.partners;
        const countDisplay = countVal !== undefined && countVal !== null ? String(countVal) : "-";

        let names: string[] = [];
        if (Array.isArray(cat.service_names) && cat.service_names.length > 0) {
            names = cat.service_names.map((n: string) => String(n).trim()).filter(Boolean);
        } else if (Array.isArray(cat.service_ids) && cat.service_ids.length > 0) {
            names = cat.service_ids
                .map((id: string) => serviceIdToName[id])
                .filter(Boolean) as string[];
        }

        if (names.length === 0) {
            return countDisplay;
        }

        return (
            <div className="pin-code-hover-wrapper">
                <span className="pin-code-hover-trigger">{countDisplay}</span>
                <div className="pin-code-hover-card">
                    {names.map((n) => (
                        <div key={n} className="pin-code-hover-item">
                            {n}
                        </div>
                    ))}
                </div>
            </div>
        );
    }, [serviceIdToName]);

    const categoryColumns = React.useMemo(() => [
        {
            Header: "SR No",
            accessor: "serial_no",
            Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
        },
        {
            Header: "Category ID",
            accessor: "category_id",
            Cell: ({ row }: { row: any }) => (
                <span
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            AddEditCategoryDialog.show(
                                true,
                                row.original,
                                () => refreshData("box-category"),
                                true
                            );
                        }
                    }}
                    style={{
                        cursor: "pointer",
                        color: "#000",
                        textDecoration: "underline",
                        fontWeight: 500,
                    }}
                    onClick={() =>
                        AddEditCategoryDialog.show(
                            true,
                            row.original,
                            () => refreshData("box-category"),
                            true
                        )
                    }
                >
                    {row.original.category_id ?? "-"}
                </span>
            ),
        },
        { Header: "Category Name", accessor: "name", sort: true },
        { Header: "Description", accessor: "desc" },
        {
            Header: "Services",
            accessor: "services",
            Cell: ({ row }: { row: any }) => {
                const cat = row.original;
                const countVal = cat.services ?? null;
                const countNum = typeof countVal === "number" ? countVal : Number(countVal);
                const countDisplay =
                    countVal !== undefined && countVal !== null ? String(countVal) : "-";

                // Prefer real service names if API provides them; otherwise show a static fallback.
                let names: string[] = [];

                if (Array.isArray(cat.service_names) && cat.service_names.length > 0) {
                    names = cat.service_names.map((n: any) => String(n)).filter(Boolean);
                } else if (Array.isArray(cat.service_ids) && cat.service_ids.length > 0) {
                    names = cat.service_ids
                        .map((id: any) => serviceIdToName[String(id)])
                        .filter(Boolean) as string[];
                } else if (!Number.isNaN(countNum) && countNum > 0) {
                    names = serviceNameList.slice(0, Math.floor(countNum));
                }

                if (!names || names.length === 0) return countDisplay;

                return (
                    <div className="pin-code-hover-wrapper">
                        <span className="pin-code-hover-trigger">{countDisplay}</span>
                        <div className="pin-code-hover-card">
                            {names.map((n, idx) => (
                                <div key={`${n}-${idx}`} className="pin-code-hover-item">
                                    {n}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            },
        },
        { Header: "Partners", accessor: "helpers", Cell: partnerCountCell },
        {
            Header: "Status",
            accessor: "is_active",
            Cell: statusCell("is_active"),
        },
        {
            Header: "Action",
            accessor: "action",
            Cell: ({ row }: { row: any }) => (
                <CustomActionColumn
                    row={row}
                    // onEdit={() => {
                    //     AddEditCategoryDialog.show(true, row.original, () => refreshData("box-category"), false);
                    // }}
                    onDelete={async () => {
                        openConfirmDialog(
                            "Are you sure you want to void this category? ",
                            "Void",
                            "Cancel",
                            async () => {
                                const response = await deleteCategory(row.original._id);
                                if (response) {
                                    refreshData("box-category");
                                }
                            }
                        );
                    }}
                />
            ),
        },
    ], [currentPage, pageSize, serviceIdToName, serviceNameList, partnerCountCell, refreshData]);

    const serviceColumns = React.useMemo(() => [
        {
            Header: "SR No",
            accessor: "serial_no",
            Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
        },
        {
            Header: "Service ID",
            accessor: "service_id",
            Cell: ({ row }: { row: any }) => (
                <span
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            AddEditServiceDialog.show(true, row.original, () => refreshData("box-service"), true);
                        }
                    }}
                    style={{
                        cursor: "pointer",
                        color: "#000",
                        textDecoration: "underline",
                        fontWeight: 500,
                    }}
                    onClick={() => AddEditServiceDialog.show(true, row.original, () => refreshData("box-service"), true)}
                >
                    {row.original.service_id ?? "-"}
                </span>
            ),
        },
        { Header: "Service Name", accessor: "name", sort: true },
        { Header: "Description", accessor: "desc" },
        { Header: "Category", accessor: "category_name" },
        {
            Header: "Price",
            accessor: "price",
            Cell: priceCell("price"),
        },
        { Header: "Helpers", accessor: "helpers" },
        {
            Header: "Status",
            accessor: "is_active",
            Cell: statusCell("is_active"),
        },
        {
            Header: "Action",
            accessor: "action",
            Cell: ({ row }: { row: any }) => (
                <CustomActionColumn
                    row={row}
                    // onEdit={() => {
                    //     AddEditServiceDialog.show(true, row.original, () => refreshData("box-service"));
                    // }}
                    onDelete={async () => {
                        openConfirmDialog(
                            "Are you sure you want to void this service? ",
                            "Void",
                            "Cancel",
                            async () => {
                                const response = await deleteService(row.original._id);
                                if (response) {
                                    refreshData("box-service");
                                }
                            }
                        );
                    }}
                />
            ),
        },
    ], [currentPage, pageSize, refreshData]);

    /* ADDED: requested category columns */
    const requestedCategoryColumns = React.useMemo(() => [
        {
            Header: "S.No",
            accessor: "serial_no",
            Cell: ({ row }: { row: any }) => row.index + 1,
        },
        { Header: "Requested ID", accessor: "request_id" },
        { Header: "Category Name", accessor: "name" },
        { Header: "Description", accessor: "desc" },
        {
            Header: "Date",
            accessor: "createdAt",
            Cell: ({ row }: { row: any }) => formatDate(row.original.createdAt),
        },
        {
            Header: "Status",
            accessor: "status",
            Cell: pendingStatusCell(),
        },
        {
            Header: "Action",
            accessor: "action",
            Cell: ({ row }: { row: any }) => (
                <CustomActionColumn
                    row={row}
                    onEdit={() => {
                        AddEditCategoryDialog.show(true, row.original, openRequestedCategory);
                    }}
                    onDelete={async () => {
                        openConfirmDialog(
                            "Are you sure you want to void this category? ",
                            "Void",
                            "Cancel",
                            async () => {
                                setRequestedCategoryList((prev) =>
                                    prev.filter((item) => item._id !== row.original._id)
                                );
                            }
                        );
                    }}
                />
            ),
        },
    ], []);

    /* ADDED: requested service columns */
    const requestedServiceColumns = React.useMemo(() => [
        {
            Header: "S.No",
            accessor: "serial_no",
            Cell: ({ row }: { row: any }) => row.index + 1,
        },
        { Header: "Requested ID", accessor: "request_id" },
        { Header: "Service Name", accessor: "name" },
        { Header: "Description", accessor: "desc" },
        { Header: "Category", accessor: "category_name" },
        {
            Header: "Date",
            accessor: "createdAt",
            Cell: ({ row }: { row: any }) => formatDate(row.original.createdAt),
        },
        {
            Header: "Status",
            accessor: "status",
            Cell: pendingStatusCell(),
        },
        {
            Header: "Action",
            accessor: "action",
            Cell: ({ row }: { row: any }) => (
                <CustomActionColumn
                    row={row}
                    onEdit={() => {
                        AddEditServiceDialog.show(true, row.original, openRequestedService);
                    }}
                    onDelete={async () => {
                        openConfirmDialog(
                            "Are you sure you want to void this service? ",
                            "Void",
                            "Cancel",
                            async () => {
                                setRequestedServiceList((prev) =>
                                    prev.filter((item) => item._id !== row.original._id)
                                );
                            }
                        );
                    }}
                />
            ),
        },
    ], []);

    return (
        <>
            <div className="main-page-content">
                <CustomHeader title="Service Management" register={register} setValue={setValue} />

                <div className="box-container">
                    {["box-category", "box-service"].map((id) => (
                        <CustomSummaryBox
                            key={id}
                            divId={id}
                            title={capitalizeString(id.replace("box-", "").replace("-", " "))}
                            data={id === "box-category" ? categoryData : serviceData}
                            onSelect={(divId) => {
                                setSelectedBox(divId);
                                setShowRequestedCategory(false);
                                setShowRequestedService(false);
                                handleFilterChange({});
                            }}
                            isSelected={selectedBox === id}
                            onFilterChange={(filter) => {
                                handleFilterChange(filter);
                            }}
                            onItemClick={(key) => {
                                if (id === "box-category" && key === "requested_category") {
                                    openRequestedCategory();
                                }
                                if (id === "box-service" && key === "requested_service") {
                                    openRequestedService();
                                }
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
                        showRequestedCategory
                            ? "Requested Categories"
                            : showRequestedService
                            ? "Requested Services"
                            : selectedBox === "box-category"
                            ? "Categories"
                            : "Services"
                    }
                    searchHint={`${showRequestedCategory
                        ? "Search Requested ID, Category name, Description etc."
                        : showRequestedService
                        ? "Search Requested ID, Service name, Description etc."
                        : selectedBox === "box-category"
                        ? "Search Category name, ID, Description etc."
                        : "Search Service name, ID, Description etc."
                    }`}
                    onDownloadClick={async () => {
                        if (showRequestedCategory) {
                            await exportData(ApiPaths.EXPORT_CATEGORY);
                        } else if (showRequestedService) {
                            await exportData(ApiPaths.EXPORT_SERVICE);
                        } else {
                            selectedBox === "box-category"
                                ? await exportData(ApiPaths.EXPORT_CATEGORY)
                                : await exportData(ApiPaths.EXPORT_SERVICE);
                        }
                    }}
                    onSortClick={(value) => {
                        if (!showRequestedCategory && !showRequestedService) {
                            handleFilterChange({ sort: value });
                        }
                    }}
                    onMoreClick={() => { }}
                    onSearch={(value) => {
                        if (showRequestedCategory) {
                            const searchValue = value.toLowerCase();
                            const filteredData = staticRequestedCategoryList.filter((item) =>
                                item.request_id.toLowerCase().includes(searchValue) ||
                                item.name.toLowerCase().includes(searchValue) ||
                                item.desc.toLowerCase().includes(searchValue)
                            );
                            setRequestedCategoryList(filteredData);
                        } else if (showRequestedService) {
                            const searchValue = value.toLowerCase();
                            const filteredData = staticRequestedServiceList.filter((item) =>
                                item.request_id.toLowerCase().includes(searchValue) ||
                                item.name.toLowerCase().includes(searchValue) ||
                                item.desc.toLowerCase().includes(searchValue) ||
                                item.category_name.toLowerCase().includes(searchValue)
                            );
                            setRequestedServiceList(filteredData);
                        } else {
                            handleFilterChange({ keyword: value });
                        }
                    }}
                />

                <CustomTable
                    columns={
                        showRequestedCategory
                            ? requestedCategoryColumns
                            : showRequestedService
                            ? requestedServiceColumns
                            : selectedBox === "box-category"
                            ? categoryColumns
                            : serviceColumns
                    }
                    data={
                        showRequestedCategory
                            ? requestedCategoryList
                            : showRequestedService
                            ? requestedServiceList
                            : selectedBox === "box-category"
                            ? categoryList
                            : serviceList
                    }
                    pageSize={pageSize}
                    currentPage={currentPage}
                    totalPages={showRequestedCategory || showRequestedService ? 1 : totalPages}
                    onPageChange={(page: number) => setCurrentPage(page)}
                    onLimitChange={(pageSize: number) => {
                        setPageSize(pageSize);
                        setCurrentPage(1);
                    }}
                    manualSortBy={!showRequestedCategory && !showRequestedService}
                    sortBy={sortBy}
                    onSortChange={(next) => {
                        setSortBy(next);
                        setCurrentPage(1);
                    }}
                    theadClass="table-light"
                />
            </div>
        </>
    );
};

export default ServiceManagement;