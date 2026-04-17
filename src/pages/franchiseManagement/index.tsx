import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CustomHeader from "../../components/CustomHeader";
import CustomSummaryBox from "../../components/CustomSummaryBox";
import CustomUtilityBox from "../../components/CustomUtilityBox";
import { capitalizeString, statusCell } from "../../helper/utility";
import CustomTable from "../../components/CustomTable";
import AddEditFranchiseDialog from "./AddEditFranchiseDialog";
import CustomActionColumn from "../../components/CustomActionColumn";
import { openConfirmDialog } from "../../components/CustomConfirmDialog";
import { useForm } from "react-hook-form";
import { deleteFranchise, fetchFranchise } from "../../services/franchiseService";

function normalizeLabelList(raw: unknown): string[] {
    if (Array.isArray(raw)) {
        return raw.map((a: unknown) => String(a).trim()).filter(Boolean);
    }
    if (typeof raw === "string") {
        return raw.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [];
}

function multiNamesHoverCell(primaryKey: string, fallbackKey?: string) {
    return function MultiNamesHoverCell({ row }: { row: any }) {
        const orig = row?.original ?? {};
        const raw =
            fallbackKey !== undefined ? orig[primaryKey] ?? orig[fallbackKey] : orig[primaryKey];
        const items = normalizeLabelList(raw);

        if (items.length === 0) return <>-</>;
        if (items.length === 1) return <>{items[0]}</>;

        return (
            <div className="pin-code-hover-wrapper">
                <span className="pin-code-hover-trigger">
                    {items[0]}...
                    <span className="pin-code-more-count"> +{items.length - 1}</span>
                </span>
                <div className="pin-code-hover-card">
                    {items.map((label: string, idx: number) => (
                        <div key={`${label}-${idx}`} className="pin-code-hover-item">
                            {label}
                        </div>
                    ))}
                </div>
            </div>
        );
    };
}

const FranchiseManagement = () => {
    const TableComponent: any = CustomTable;
    const { register, setValue } = useForm<any>();
    const [franchiseData] = useState({
        Total: 3,
        Active: 2,
        Inactive: 1,
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [franchiseList, setFranchiseList] = useState<any[]>([]);
    const [totalPages, setTotalPages] = useState(0);

    const [filters, setFilters] = useState<{
        name?: string;
        status?: string;
        sort?: string;
    }>({});

    const fetchRef = useRef(false);

    const fetchData = useCallback(async () => {
        if (fetchRef.current) return;
        fetchRef.current = true;
        try {
            const { response, franchises, totalPages } = await fetchFranchise(
                currentPage,
                pageSize,
                filters
            );
            if (response) {
                setFranchiseList(franchises as any[]);
                setTotalPages(totalPages);
            } else {
                setFranchiseList([]);
                setTotalPages(0);
            }
        } finally {
            fetchRef.current = false;
        }
    }, [currentPage, filters, pageSize]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const refreshData = useCallback(() => {
        void fetchData();
    }, [fetchData]);

    const handleFilterChange = (nextFilters: {
        name?: string;
        status?: string;
        sort?: string;
    }) => {
        setCurrentPage(1);
        setFilters(nextFilters);
    };

    const franchiseColumns = useMemo(
        () => [
            {
                Header: "SR No",
                accessor: "serial_no",
                width: "5%",
                Cell: ({ row }: { row: any }) =>
                    (currentPage - 1) * pageSize + row.index + 1,
            },
            { Header: "Franchise Name", accessor: "name", width: "15%" },
            { Header: "Admin Name", accessor: "admin_name", width: "10%" },
            { Header: "State Name", accessor: "state_name", width: "11%" },
            { Header: "City Name", accessor: "city_name", width: "9%" },
            {
                Header: "Area Name",
                accessor: "area_name",
                width: "10%",
                Cell: multiNamesHoverCell("area_name", "areas"),
            },
            {
                Header: "Categories",
                accessor: "category_names",
                width: "10%",
                Cell: multiNamesHoverCell("category_names"),
            },
            {
                Header: "Services",
                accessor: "service_names",
                width: "12%",
                Cell: multiNamesHoverCell("service_names"),
            },
            // { Header: "Description", accessor: "description" },
            {
                Header: "Status",
                accessor: "is_active",
                width: "9%",
                Cell: statusCell("is_active"),
            },
            {
                Header: "Action",
                accessor: "action",
                width: "9%",
                Cell: ({ row }: { row: any }) => (
                    <CustomActionColumn
                        row={row}
                        onView={() => {
                            AddEditFranchiseDialog.show(true, row.original, () => refreshData(), true);
                        }}
                        onDelete={async () => {
                            openConfirmDialog(
                                "Are you sure you want to void this franchise?",
                                "Void",
                                "Cancel",
                                async () => {
                                    const id = row?.original?._id;
                                    if (!id) return;
                                    const ok = await deleteFranchise(String(id));
                                    if (ok) refreshData();
                                }
                            );
                        }}
                    />
                ),
            },
        ],
        [currentPage, pageSize, refreshData]
    );

    return (
        <>
            <div className="main-page-content">
                <CustomHeader title="Franchise Management" register={register} setValue={setValue} />

                <div className="box-container">
                    <CustomSummaryBox
                        divId="box-franchise"
                        title={capitalizeString("franchise")}
                        data={franchiseData}
                        onSelect={() => {
                            handleFilterChange({});
                        }}
                        isSelected={true}
                        onFilterChange={(filter) => {
                            handleFilterChange(filter);
                        }}
                        isAddShow={true}
                        addButtonLable="Add Franchise"
                        onAddClick={() => {
                            AddEditFranchiseDialog.show(false, null, () => refreshData());
                        }}
                    />
                </div>

                <CustomUtilityBox
                    title="Franchises"
                    searchHint="Search Franchise Name"
                    onDownloadClick={async () => {}}
                    onSortClick={(value) => {
                        handleFilterChange({ sort: value });
                    }}
                    onMoreClick={() => {}}
                    onSearch={(value) => handleFilterChange({ name: value })}
                />

                {TableComponent ? (
                    <TableComponent
                        columns={franchiseColumns}
                        data={franchiseList}
                        pageSize={pageSize}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        horizontalScroll={false}
                        onPageChange={(page: number) => setCurrentPage(page)}
                        onLimitChange={(pageSize: number) => {
                            setPageSize(pageSize);
                            setCurrentPage(1);
                        }}
                        theadClass="table-light"
                    />
                ) : null}
            </div>
        </>
    );
};

export default FranchiseManagement;