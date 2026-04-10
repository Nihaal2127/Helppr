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

const FranchiseManagement = () => {
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

    const areaNamesCell = ({ row }: { row: any }) => {
        const raw = row?.original?.area_name ?? row?.original?.areas ?? [];
        const areas: string[] = Array.isArray(raw)
            ? raw.map((a: any) => String(a).trim()).filter(Boolean)
            : typeof raw === "string"
                ? raw.split(",").map((a) => a.trim()).filter(Boolean)
                : [];

        if (areas.length === 0) return "-";
        if (areas.length === 1) return areas[0];

        return (
            <div className="pin-code-hover-wrapper">
                <span className="pin-code-hover-trigger">
                    {areas[0]}...
                    <span className="pin-code-more-count"> +{areas.length - 1}</span>
                </span>
                <div className="pin-code-hover-card">
                    {areas.map((a: string) => (
                        <div key={a} className="pin-code-hover-item">
                            {a}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

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
                Cell: ({ row }: { row: any }) =>
                    (currentPage - 1) * pageSize + row.index + 1,
            },
            { Header: "Franchise Name", accessor: "name" },
            { Header: "State Name", accessor: "state_name" },
            { Header: "City Name", accessor: "city_name" },
            {
                Header: "Area Name",
                accessor: "area_name",
                Cell: areaNamesCell,
            },
            { Header: "Admin Name", accessor: "admin_name" },
            { Header: "Description", accessor: "description" },
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

                <CustomTable
                    columns={franchiseColumns}
                    data={franchiseList}
                    pageSize={pageSize}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page: number) => setCurrentPage(page)}
                    onLimitChange={(limit: number) => {
                        setCurrentPage(1);
                        setPageSize(limit);
                    }}
                    theadClass="table-light"
                />
            </div>
        </>
    );
};

export default FranchiseManagement;