import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "react-bootstrap";
import CustomHeader from "../../components/CustomHeader";
import CustomSummaryBox from "../../components/CustomSummaryBox";
import CustomUtilityBox from "../../components/CustomUtilityBox";
import { capitalizeString, statusCell } from "../../helper/utility";
import CustomTable from "../../components/CustomTable";
import AddEditFranchiseDialog from "./AddEditFranchiseDialog";
import CustomActionColumn from "../../components/CustomActionColumn";
import { PinCodeHoverPortal } from "../../components/PinCodeHoverPortal";
import { openConfirmDialog } from "../../components/CustomConfirmDialog";
import { useForm } from "react-hook-form";
import { deleteFranchise, fetchFranchise, fetchFranchiseById } from "../../services/franchiseService";
import { fetchCategory } from "../../services/categoryService";
import { fetchService } from "../../services/servicesService";
import type { ServerTableSortBy } from "../../helper/serverTableSort";

/**
 * List-fetch generation counter (module scope).
 * Using a ref caused `ReferenceError: fetchGenerationRef is not defined` after partial HMR:
 * the hot bundle could update `fetchData` before the ref declaration landed.
 */
let franchiseManagementFetchGeneration = 0;

function normalizeLabelList(raw: unknown): string[] {
    if (Array.isArray(raw)) {
        return raw.map((a: unknown) => String(a).trim()).filter(Boolean);
    }
    if (typeof raw === "string") {
        return raw.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [];
}

function resolveNamedLabels(
    row: Record<string, unknown>,
    namesKey: string,
    idsKey: string,
    altIdsKey: string | undefined,
    idToLabel: Map<string, string>
): string[] {
    const nameList = normalizeLabelList(row[namesKey]);
    if (nameList.length > 0) return nameList;
    const rawIds =
        altIdsKey !== undefined ? row[idsKey] ?? row[altIdsKey] : row[idsKey];
    const ids = normalizeLabelList(rawIds);
    return ids.map((id) => idToLabel.get(id) ?? id);
}

/** Categories: ellipsis + red +n; hover shows bullet list */
function categoriesTableCell(idToLabel: Map<string, string>) {
    return function CategoriesCell({ row }: { row: any }) {
        const items = resolveNamedLabels(row.original ?? {}, "category_names", "category_ids", "categories", idToLabel);
        if (items.length === 0) return <>-</>;
        if (items.length === 1) {
            return (
                <span className="d-inline-block text-truncate" style={{ maxWidth: 180 }} title={items[0]}>
                    {items[0]}
                </span>
            );
        }
        const more = items.length - 1;
        return (
            <PinCodeHoverPortal items={items} listStyle="ul">
                <span className="pin-code-hover-trigger d-flex align-items-center flex-nowrap gap-1 w-100 min-w-0">
                    <span
                        className="text-truncate min-w-0"
                        style={{ flex: "1 1 0%" }}
                        title={items[0]}
                    >
                        {items[0]}
                    </span>
                  
                    <span className="flex-shrink-0" style={{ color: "red", fontWeight: 600 }}>
                        +{more}
                    </span>
                </span>
            </PinCodeHoverPortal>
        );
    };
}

/** Services: ellipsis + red +n; hover shows bullet list */
function servicesTableCell(idToLabel: Map<string, string>) {
    return function ServicesCell({ row }: { row: any }) {
        const items = resolveNamedLabels(row.original ?? {}, "service_names", "service_ids", "services", idToLabel);
        if (items.length === 0) return <>-</>;
        if (items.length === 1) {
            return (
                <span className="d-inline-block text-truncate" style={{ maxWidth: 150 }} title={items[0]}>
                    {items[0]}
                </span>
            );
        }
        const more = items.length - 1;
        return (
            <PinCodeHoverPortal items={items} listStyle="ul">
                <span className="pin-code-hover-trigger d-flex align-items-center flex-nowrap gap-1 w-100 min-w-0">
                    <span
                        className="text-truncate min-w-0"
                        style={{ flex: "1 1 0%" }}
                        title={items[0]}
                    >
                        {items[0]}
                    </span>
                 
                    <span className="flex-shrink-0" style={{ color: "red", fontWeight: 600 }}>
                        +{more}
                    </span>
                </span>
            </PinCodeHoverPortal>
        );
    };
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
            <PinCodeHoverPortal items={items} listStyle="div">
                <span className="pin-code-hover-trigger d-flex align-items-center flex-nowrap gap-1 w-100 min-w-0">
                    <span
                        className="min-w-0"
                        style={{ flex: "1 1 0%" }}
                        title={items[0]}
                    >
                        {items[0]}...
                    </span>
                    <span className="pin-code-more-count flex-shrink-0">+{items.length - 1}</span>
                </span>
            </PinCodeHoverPortal>
        );
    };
}

const FranchiseManagement = () => {
    const TableComponent: any = CustomTable;
    const { register, setValue } = useForm<{ franchise_id: string } & Record<string, unknown>>({
        defaultValues: { franchise_id: "all" },
    });
    /** Header dropdown must drive fetches via state — `watch(franchise_id)` does not reliably update when CustomFormSelect overrides `register` onChange. */
    const [headerFranchiseId, setHeaderFranchiseId] = useState("all");
    const [franchiseData, setFranchiseData] = useState({
        Total: 0,
        Active: 0,
        Inactive: 0,
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [franchiseList, setFranchiseList] = useState<any[]>([]);
    const [totalPages, setTotalPages] = useState(0);

    const [filters, setFilters] = useState<{
        search?: string;
        status?: string;
        sort_order?: "asc" | "desc";
    }>({});
    const [sortBy, setSortBy] = useState<ServerTableSortBy>([]);
    const [utilitySearchKey, setUtilitySearchKey] = useState(0);

    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const [categoryById, setCategoryById] = useState<Map<string, string>>(() => new Map());
    const [serviceById, setServiceById] = useState<Map<string, string>>(() => new Map());

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            const catMap = new Map<string, string>();
            const svcMap = new Map<string, string>();
            const limit = 200;
            let page = 1;
            for (;;) {
                const res = await fetchCategory(page, limit, {}, []);
                if (cancelled) return;
                if (!res.response) break;
                for (const c of res.categories) {
                    const id = String((c as { _id?: string })._id ?? "").trim();
                    const name = String((c as { name?: string }).name ?? "").trim();
                    if (id) catMap.set(id, name || id);
                }
                if (!res.totalPages || page >= res.totalPages) break;
                page += 1;
                if (page > 50) break;
            }
            if (cancelled) return;
            page = 1;
            for (;;) {
                const res = await fetchService(page, limit, {}, []);
                if (cancelled) return;
                if (!res.response) break;
                for (const s of res.services) {
                    const id = String((s as { _id?: string })._id ?? "").trim();
                    const name = String((s as { name?: string }).name ?? "").trim();
                    if (id) svcMap.set(id, name || id);
                }
                if (!res.totalPages || page >= res.totalPages) break;
                page += 1;
                if (page > 50) break;
            }
            if (!cancelled && isMountedRef.current) {
                setCategoryById(catMap);
                setServiceById(svcMap);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const fetchData = useCallback(async () => {
        const gen = ++franchiseManagementFetchGeneration;
        const fid = String(headerFranchiseId ?? "").trim();
        const apiFilters = {
            ...filters,
            ...(fid && fid !== "all" ? { franchise_id: fid } : {}),
        };
        if (fid && fid !== "all") {
            let row = await fetchFranchiseById(fid);
            if (!row) {
                const wide = await fetchFranchise(1, 500, apiFilters, sortBy);
                const list = wide.franchises as any[];
                row =
                    list.find((r) => String(r?._id ?? "") === fid) ??
                    (list.length === 1 ? list[0] : null);
            }
            if (!isMountedRef.current) return;
            if (gen !== franchiseManagementFetchGeneration) return;

            let rows: any[] = row ? [row] : [];
            const kw = String(filters.search ?? "").trim().toLowerCase();
            if (rows.length && kw) {
                const blob = [
                    rows[0]?.name,
                    rows[0]?.admin_name,
                    rows[0]?.state_name,
                    rows[0]?.city_name,
                    rows[0]?.email,
                    rows[0]?.phone_number,
                ]
                    .map((x) => String(x ?? "").toLowerCase())
                    .join(" ");
                if (!blob.includes(kw)) rows = [];
            }
            if (rows.length && filters.status && filters.status !== "All") {
                const want = filters.status.toLowerCase() === "true";
                if (Boolean(rows[0].is_active) !== want) rows = [];
            }

            setFranchiseList(rows);
            setTotalPages(rows.length ? 1 : 0);
            const total = rows.length;
            const active = rows.filter((r) => r.is_active).length;
            setFranchiseData({
                Total: total,
                Active: active,
                Inactive: total - active,
            });
        } else {
            const [listRes, totalRes, activeRes, inactiveRes] = await Promise.all([
                fetchFranchise(currentPage, pageSize, apiFilters, sortBy),
                fetchFranchise(1, 1, { ...apiFilters, status: undefined }, []),
                fetchFranchise(1, 1, { ...apiFilters, status: "true" }, []),
                fetchFranchise(1, 1, { ...apiFilters, status: "false" }, []),
            ]);

            if (!isMountedRef.current) return;
            if (gen !== franchiseManagementFetchGeneration) return;

            const { response, franchises, totalPages } = listRes;
            if (response) {
                setFranchiseList(franchises as any[]);
                setTotalPages(totalPages);
            } else {
                setFranchiseList([]);
                setTotalPages(0);
            }

            setFranchiseData({
                Total: Number(totalRes.totalItems ?? totalRes.franchises.length ?? 0),
                Active: Number(activeRes.totalItems ?? activeRes.franchises.length ?? 0),
                Inactive: Number(inactiveRes.totalItems ?? inactiveRes.franchises.length ?? 0),
            });
        }
    }, [currentPage, filters, pageSize, sortBy, headerFranchiseId]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const refreshData = useCallback(() => {
        void fetchData();
    }, [fetchData]);

    const handleFilterChange = (nextFilters: {
        search?: string;
        status?: string;
        sort_order?: "asc" | "desc";
    }) => {
        setCurrentPage(1);
        setFilters((prev) => ({ ...prev, ...nextFilters }));
    };

    const clearFranchiseFiltersDisabled = useMemo(() => {
        const hasSearch = Boolean(String(filters.search ?? "").trim());
        const hasSummaryFilters = Boolean(filters.status) || Boolean(filters.sort_order);
        return (
            !hasSearch &&
            !hasSummaryFilters &&
            sortBy.length === 0 &&
            headerFranchiseId === "all"
        );
    }, [filters.search, filters.status, filters.sort_order, sortBy.length, headerFranchiseId]);

    const clearFranchiseFilters = () => {
        setFilters({});
        setSortBy([]);
        setCurrentPage(1);
        setHeaderFranchiseId("all");
        setValue("franchise_id", "all", { shouldValidate: false });
        setUtilitySearchKey((k) => k + 1);
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
            { Header: "Franchise", accessor: "name", sort: true },
             { Header: "Admin", accessor: "admin_name", sort: true },
            { Header: "Email", accessor: "email"},
            { Header: "Phone", accessor: "phone_number"},

           
            { Header: "State", accessor: "state_name", sort: true },
            { Header: "City", accessor: "city_name", sort: true },
            {
                Header: "Area",
                accessor: "area_name",
               
                Cell: multiNamesHoverCell("area_name", "areas"),
            },
            {
                Header: "Categories",
                accessor: "category_names",
                
                Cell: categoriesTableCell(categoryById),
            },
            {
                Header: "Services",
                accessor: "service_names",
               
                Cell: servicesTableCell(serviceById),
            },
            // { Header: "Description", accessor: "description" },
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
        [currentPage, pageSize, refreshData, categoryById, serviceById]
    );

    return (
        <>
            <div className="main-page-content">
                <CustomHeader
                    title="Franchise Management"
                    register={register}
                    setValue={setValue}
                    onLocationChange={(value) => {
                        setHeaderFranchiseId(value);
                        setCurrentPage(1);
                    }}
                />

                <div className="box-container">
                    <CustomSummaryBox
                        divId="box-franchise"
                        title={capitalizeString("franchise")}
                        data={franchiseData}
                        onSelect={() => {
                            setCurrentPage(1);
                            setFilters({});
                            setSortBy([]);
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
                    key={`franchise-utility-${utilitySearchKey}`}
                    title="Franchises"
                    searchHint="Search franchise, admin, state, city"
                    toolsInlineRow
                    hideMoreIcon
                    onSearch={(value) => handleFilterChange({ search: value })}
                    afterSearchSlot={
                        <Button
                            variant="outline-secondary"
                            
                            className="custom-btn-secondary partner-payout-clear-btn px-3"
                            type="button"
                            disabled={clearFranchiseFiltersDisabled}
                            onClick={clearFranchiseFilters}
                        >
                            Clear
                        </Button>
                    }
                />

                {TableComponent ? (
                    <TableComponent
                        columns={franchiseColumns}
                        data={franchiseList}
                        pageSize={pageSize}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={(page: number) => setCurrentPage(page)}
                        onLimitChange={(pageSize: number) => {
                            setPageSize(pageSize);
                            setCurrentPage(1);
                        }}
                        manualSortBy
                        sortBy={sortBy}
                        onSortChange={(next: { id: string; desc: boolean }[]) => {
                            setSortBy(next);
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