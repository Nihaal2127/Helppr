import React, { useState, useEffect, useCallback, useRef } from "react";
import { Form } from "react-bootstrap";
import { useSearchParams } from "react-router-dom";
import CustomHeader from "../../components/CustomHeader";
import CustomSummaryBox from "../../components/CustomSummaryBox";
import CustomUtilityBox from "../../components/CustomUtilityBox";
import { capitalizeString, formatDate } from "../../helper/utility";
import CustomTable from "../../components/CustomTable";
import AddEditCategoryDialog from "./AddEditCategoryDialog";
import { showAddEditServiceDialog } from "./AddEditServiceDialog";
import AddEditSubCategoryDialog from "./AddEditSubCategoryDialog";
import type { SubCategoryDetails } from "./AddEditSubCategoryDialog";
import { CategoryModel } from "../../lib/models/CategoryModel";
import { ServiceModel } from "../../lib/models/ServiceModel";
import {
  fetchCategory,
  fetchCategoryById,
  patchCategoryCatalogActiveStatus,
} from "../../services/categoryService";
import {
  fetchService,
  fetchServiceById,
  patchServiceCatalogActiveStatus,
} from "../../services/servicesService";
import CustomActionColumn from "../../components/CustomActionColumn";
import type { ServerTableSortBy } from "../../lib/global/serverTableSort";
import {
  useFranchiseHeaderForm,
  useFranchiseScopedGetCount,
} from "../../lib/global/hooks/useFranchiseScopedGetCount";
import {
  franchiseIdForApiQuery,
  isFranchisePortalSession,
} from "../../lib/franchise/headerFranchisePreference";
import {
  showErrorAlert,
  showSuccessAlert,
} from "../../lib/global/alertHelper";
import {
  setCategoryActive as apiSetCategoryActive,
  setServiceActive as apiSetServiceActive,
} from "../../services/myFranchiseService";

const CATEGORY_ROW_ID_KEYS = ["_id", "category_id", "id"] as const;
const SERVICE_ROW_ID_KEYS = ["_id", "service_id", "id"] as const;
const SUBCATEGORY_ROW_ID_KEYS = ["_id", "id"] as const;

type SubCategoryRow = SubCategoryDetails & {
  franchise_active?: boolean;
};

const CATALOG_MODERATION_KEYS = [
  "approval_status",
  "is_request",
  "is_rejected",
  "requested_by",
  "rejection_reason",
] as const;

/** Prefer GET-by-id fields; keep list-row moderation fields if the API omits them. */
function mergeModerationDetail<T extends object>(
  row: Record<string, unknown>,
  api: T
): T {
  const out: Record<string, unknown> = {
    ...(row as object),
    ...(api as object),
  };
  for (const key of CATALOG_MODERATION_KEYS) {
    if (
      (out[key] === undefined || out[key] === null) &&
      row[key] !== undefined
    ) {
      out[key] = row[key];
    }
  }
  if (!String(out.desc ?? "").trim() && row.description) {
    out.desc = row.description;
  }
  return out as T;
}

function mergeServiceDetailForDialog(
  row: Record<string, unknown>,
  api: ServiceModel
): ServiceModel {
  return mergeModerationDetail(row, api);
}

function mergeCategoryDetailForDialog<T extends object>(
  row: Record<string, unknown>,
  api: T
): T {
  return mergeModerationDetail(row, api);
}

function recordIdFromRow(
  row: { original?: Record<string, unknown> },
  keys: readonly string[]
): string {
  const o = row?.original;
  if (!o || typeof o !== "object") return "";
  for (const k of keys) {
    const v = o[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function coerceCatalogRowActive(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1") return true;
  if (value === 0 || value === "0") return false;
  const s = String(value ?? "").trim().toLowerCase();
  if (s === "true" || s === "active" || s === "yes") return true;
  if (s === "false" || s === "inactive" || s === "no") return false;
  return false;
}

function catalogActiveValue(
  row: Record<string, unknown>,
  field: string
): boolean {
  return coerceCatalogRowActive(row[field]);
}

const requestStatusCell = () => ({ row }: { row: any }) => {
  const o = row?.original;
  const raw = String(o?.approval_status ?? "")
    .trim()
    .toLowerCase();
  if (
    raw === "rejected" ||
    raw === "reject" ||
    o?.is_rejected === true
  ) {
    return <span style={{ color: "red", fontWeight: 600 }}>Rejected</span>;
  }
  if (
    raw === "approved" ||
    raw === "approve" ||
    o?.is_rejected === false
  ) {
    return <span style={{ color: "green", fontWeight: 600 }}>Approved</span>;
  }
  if (raw === "pending") {
    return <span style={{ color: "orange", fontWeight: 600 }}>Pending</span>;
  }
  if (
    o?.is_request &&
    (o?.is_rejected === null || o?.is_rejected === undefined)
  ) {
    return <span style={{ color: "orange", fontWeight: 600 }}>Pending</span>;
  }
  return <span style={{ color: "orange", fontWeight: 600 }}>Pending</span>;
};


const ServiceManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const notificationDeepLinkHandledRef = useRef("");
  const { register, setValue, franchiseId: headerFranchiseId } =
    useFranchiseHeaderForm();
  const { countModel, refresh: refreshSummaryCounts } =
    useFranchiseScopedGetCount({
      type: "service-management",
      franchiseId: headerFranchiseId,
    });
  /** Super admin/staff header franchise → scoped catalog URL; franchise portal uses token-scoped global getAll. */
  const catalogFranchiseId = franchiseIdForApiQuery(headerFranchiseId);
  const franchiseCatalogScope = Boolean(catalogFranchiseId);
  const catalogListStatusField = franchiseCatalogScope
    ? "franchise_active"
    : "is_active";
  const [selectedBox, setSelectedBox] = useState<string>("box-category");
  const [categoryData, setCategoryData] = useState<Record<string, number>>({});
  const [subCategoryData, setSubCategoryData] = useState<Record<string, number>>(
    {
      Total: 0,
      Active: 0,
      Inactive: 0,
      requested_subcategory: 0,
    }
  );
  const [serviceData, setServiceData] = useState<Record<string, number>>({});
  const [categoryList, setCategoryList] = useState<CategoryModel[]>([]);
  const [subCategoryList, setSubCategoryList] = useState<SubCategoryRow[]>([
    {
      _id: "example-subcat-1",
      name: "Facial Care",
      category_name: "Beauty Care",
      is_active: true,
      franchise_active: true,
    },
    {
      _id: "example-subcat-2",
      name: "Hair Styling",
      category_name: "Beauty Care",
      is_active: true,
      franchise_active: true,
    },
    {
      _id: "example-subcat-3",
      name: "Pipe Repair",
      category_name: "Plumbing",
      is_active: false,
      franchise_active: false,
    },
  ]);
  const [serviceList, setServiceList] = useState<ServiceModel[]>([]);

  /* ADDED: requested table states */
  const [showRequestedCategory, setShowRequestedCategory] = useState(false);
  const [showRequestedService, setShowRequestedService] = useState(false);
  const [requestedCategoryList, setRequestedCategoryList] = useState<
    CategoryModel[]
  >([]);
  const [requestedServiceList, setRequestedServiceList] = useState<
    ServiceModel[]
  >([]);
  const [activeFilters, setActiveFilters] = useState<{
    keyword?: string;
    status?: string;
    sort?: string;
  }>({});

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const fetchGenerationRef = useRef(0);
  const [sortBy, setSortBy] = useState<ServerTableSortBy>([]);

  useEffect(() => {
    if (!countModel) return;
    setCategoryData({
      Total: countModel.total_category ?? 0,
      Active: countModel.active_category ?? 0,
      Inactive: countModel.inactive_category ?? 0,
      requested_category:
        countModel.requested_category ?? countModel.total_requestedcategory ?? 0,
    });
    setServiceData({
      Total: countModel.total_service ?? 0,
      Active: countModel.active_service ?? 0,
      Inactive: countModel.inactive_service ?? 0,
      requested_service:
        countModel.requested_service ?? countModel.total_requestedservice ?? 0,
    });
  }, [countModel]);

  const fetchData = useCallback(
    async (
      selected: string,
      filters: {
        keyword?: string;
        status?: string;
        sort?: string;
      }
    ) => {
      const generation = ++fetchGenerationRef.current;
      setIsTableLoading(true);

      try {
        if (selected === "box-category") {
          const { response, categories, totalPages, resolvedPage } =
            await fetchCategory(
            currentPage,
            pageSize,
            {
              ...filters,
              ...(showRequestedCategory ? { is_request: "true" } : {}),
            },
            sortBy,
            catalogFranchiseId || undefined
          );
          if (response) {
            if (generation !== fetchGenerationRef.current) return;
            if (typeof resolvedPage === "number") {
              setCurrentPage(resolvedPage);
            }
            if (showRequestedCategory) {
              setRequestedCategoryList(categories || []);
            } else {
              setCategoryList(categories || []);
            }
            setTotalPages(totalPages || 0);
          }
        } else if (selected === "box-service") {
          const { response, services, totalPages, resolvedPage } =
            await fetchService(
            currentPage,
            pageSize,
            {
              ...filters,
              ...(showRequestedService ? { is_request: "true" } : {}),
            },
            sortBy,
            catalogFranchiseId || undefined
          );
          if (response) {
            if (generation !== fetchGenerationRef.current) return;
            if (typeof resolvedPage === "number") {
              setCurrentPage(resolvedPage);
            }
            if (showRequestedService) {
              setRequestedServiceList(services || []);
            } else {
              setServiceList(services || []);
            }
            setTotalPages(totalPages || 0);
          }
        } else if (selected === "box-subcategory") {
          if (generation !== fetchGenerationRef.current) return;
          // Local catalogue — filtering/paging handled in render from `subCategoryList`.
          setTotalPages(0);
        }
      } finally {
        if (generation === fetchGenerationRef.current) {
          setIsTableLoading(false);
        }
      }
    },
    [
      currentPage,
      pageSize,
      showRequestedCategory,
      showRequestedService,
      sortBy,
      catalogFranchiseId,
    ]
  );

  /** Keep subcategory summary counts in sync with the local list. */
  useEffect(() => {
    const activeCount = subCategoryList.filter((row) =>
      catalogActiveValue(
        row as unknown as Record<string, unknown>,
        catalogListStatusField
      )
    ).length;
    setSubCategoryData({
      Total: subCategoryList.length,
      Active: activeCount,
      Inactive: Math.max(0, subCategoryList.length - activeCount),
      requested_subcategory: 0,
    });
  }, [subCategoryList, catalogListStatusField]);

  const filteredSubCategoryList = React.useMemo(() => {
    let rows = [...subCategoryList];
    const keyword = String(activeFilters.keyword ?? "")
      .trim()
      .toLowerCase();
    if (keyword) {
      rows = rows.filter((r) =>
        String(r.name ?? "")
          .toLowerCase()
          .includes(keyword)
      );
    }
    if (activeFilters.status === "true") {
      rows = rows.filter((r) =>
        catalogActiveValue(
          r as unknown as Record<string, unknown>,
          catalogListStatusField
        )
      );
    } else if (activeFilters.status === "false") {
      rows = rows.filter(
        (r) =>
          !catalogActiveValue(
            r as unknown as Record<string, unknown>,
            catalogListStatusField
          )
      );
    }
    const primary = sortBy[0];
    if (primary?.id === "name") {
      rows.sort((a, b) => {
        const cmp = String(a.name ?? "").localeCompare(String(b.name ?? ""));
        return primary.desc ? -cmp : cmp;
      });
    }
    return rows;
  }, [
    subCategoryList,
    activeFilters.keyword,
    activeFilters.status,
    sortBy,
    catalogListStatusField,
  ]);

  const pagedSubCategoryList = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSubCategoryList.slice(start, start + pageSize);
  }, [filteredSubCategoryList, currentPage, pageSize]);

  const subCategoryTotalPages = React.useMemo(() => {
    if (filteredSubCategoryList.length === 0) return 0;
    return Math.ceil(filteredSubCategoryList.length / pageSize);
  }, [filteredSubCategoryList.length, pageSize]);

  useEffect(() => {
    if (selectedBox !== "box-subcategory") return;
    setTotalPages(subCategoryTotalPages);
    if (
      subCategoryTotalPages > 0 &&
      currentPage > subCategoryTotalPages
    ) {
      setCurrentPage(subCategoryTotalPages);
    }
  }, [selectedBox, subCategoryTotalPages, currentPage]);

  const refreshData = useCallback(
    async (selected: string) => {
      await fetchData(selected, activeFilters);
    },
    [fetchData, activeFilters]
  );

  const refreshTableAfterMutation = useCallback(
    async (box: string) => {
      await refreshSummaryCounts();
      await refreshData(box);
    },
    [refreshSummaryCounts, refreshData]
  );

  const useFranchiseMappingToggle =
    franchiseCatalogScope || isFranchisePortalSession();

  const setCatalogServiceActive = useCallback(
    async (row: ServiceModel, is_active: boolean) => {
      const sid = recordIdFromRow(
        { original: row as unknown as Record<string, unknown> },
        SERVICE_ROW_ID_KEYS
      );
      if (!sid) {
        showErrorAlert("Unable to update service: missing identifier.");
        return;
      }
      const prev = catalogActiveValue(
        row as unknown as Record<string, unknown>,
        catalogListStatusField
      );
      setServiceList((list) =>
        list.map((s) => {
          const id = recordIdFromRow(
            { original: s as unknown as Record<string, unknown> },
            SERVICE_ROW_ID_KEYS
          );
          return id === sid ? ({ ...s, [catalogListStatusField]: is_active } as ServiceModel) : s;
        })
      );
      const ok = useFranchiseMappingToggle
        ? await apiSetServiceActive(
            sid,
            is_active,
            catalogFranchiseId || undefined
          )
        : await patchServiceCatalogActiveStatus(sid, is_active);
      if (ok) {
        showSuccessAlert("Service status updated");
        await refreshTableAfterMutation("box-service");
      } else {
        setServiceList((list) =>
          list.map((s) => {
            const id = recordIdFromRow(
              { original: s as unknown as Record<string, unknown> },
              SERVICE_ROW_ID_KEYS
            );
            return id === sid
              ? ({ ...s, [catalogListStatusField]: prev } as ServiceModel)
              : s;
          })
        );
        showErrorAlert("Could not update service status.");
      }
    },
    [
      catalogFranchiseId,
      catalogListStatusField,
      refreshTableAfterMutation,
      useFranchiseMappingToggle,
    ]
  );

  const setSubCategoryActive = useCallback(
    (row: SubCategoryRow, is_active: boolean) => {
      const sid = recordIdFromRow(
        { original: row as unknown as Record<string, unknown> },
        SUBCATEGORY_ROW_ID_KEYS
      );
      if (!sid) {
        showErrorAlert("Unable to update sub category: missing identifier.");
        return;
      }
      setSubCategoryList((list) =>
        list.map((item) => {
          const id = recordIdFromRow(
            { original: item as unknown as Record<string, unknown> },
            SUBCATEGORY_ROW_ID_KEYS
          );
          if (id !== sid) return item;
          return {
            ...item,
            is_active,
            franchise_active: is_active,
          };
        })
      );
      showSuccessAlert("Sub category status updated");
    },
    []
  );

  const openSubCategoryDialog = useCallback(
    (row: SubCategoryRow | null, isViewMode: boolean) => {
      AddEditSubCategoryDialog.show(row, isViewMode, {
        onSaved: (saved) => {
          if (row?._id) {
            setSubCategoryList((list) =>
              list.map((item) =>
                item._id === row._id
                  ? {
                      ...item,
                      name: saved.name,
                      category_name: saved.category_name,
                    }
                  : item
              )
            );
            return;
          }
          setSubCategoryList((list) => [
            ...list,
            {
              _id: `subcat-${Date.now()}`,
              name: saved.name,
              category_name: saved.category_name,
              is_active: true,
              franchise_active: true,
            },
          ]);
        },
      });
    },
    []
  );

  const setCatalogCategoryActive = useCallback(
    async (row: CategoryModel, is_active: boolean) => {
      const cid = recordIdFromRow(
        { original: row as unknown as Record<string, unknown> },
        CATEGORY_ROW_ID_KEYS
      );
      if (!cid) {
        showErrorAlert("Unable to update category: missing identifier.");
        return;
      }
      const prev = catalogActiveValue(
        row as unknown as Record<string, unknown>,
        catalogListStatusField
      );
      setCategoryList((list) =>
        list.map((c) =>
          recordIdFromRow(
            { original: c as unknown as Record<string, unknown> },
            CATEGORY_ROW_ID_KEYS
          ) === cid
            ? ({ ...c, [catalogListStatusField]: is_active } as CategoryModel)
            : c
        )
      );
      const ok = useFranchiseMappingToggle
        ? await apiSetCategoryActive(
            cid,
            is_active,
            catalogFranchiseId || undefined
          )
        : await patchCategoryCatalogActiveStatus(cid, is_active);
      if (ok) {
        showSuccessAlert("Category status updated");
        await refreshTableAfterMutation("box-category");
      } else {
        setCategoryList((list) =>
          list.map((c) =>
            recordIdFromRow(
              { original: c as unknown as Record<string, unknown> },
              CATEGORY_ROW_ID_KEYS
            ) === cid
              ? ({ ...c, [catalogListStatusField]: prev } as CategoryModel)
              : c
          )
        );
        showErrorAlert("Could not update category status.");
      }
    },
    [
      catalogFranchiseId,
      catalogListStatusField,
      refreshTableAfterMutation,
      useFranchiseMappingToggle,
    ]
  );

  useEffect(() => {
    void refreshData(selectedBox);
  }, [
    selectedBox,
    pageSize,
    currentPage,
    showRequestedCategory,
    showRequestedService,
    refreshData,
    catalogFranchiseId,
  ]);


  const handleFilterChange = async (
    filters: {
      keyword?: string;
      status?: string;
      sort?: string;
    },
    targetBox?: string
  ) => {
    setCurrentPage(1);
    setTotalPages(0);
    setSortBy([]);
    setActiveFilters(filters);
    if (targetBox && targetBox !== selectedBox) {
      setSelectedBox(targetBox);
    }
  };

  /* ADDED: open requested category table */
  const openRequestedCategory = useCallback(() => {
    setSelectedBox("box-category");
    setShowRequestedCategory(true);
    setShowRequestedService(false);
    setCurrentPage(1);
    setSortBy([]);
  }, []);

  /* ADDED: open requested service table */
  const openRequestedService = useCallback(() => {
    setSelectedBox("box-service");
    setShowRequestedService(true);
    setShowRequestedCategory(false);
    setCurrentPage(1);
    setSortBy([]);
  }, []);

  useEffect(() => {
    const requested = String(searchParams.get("requested") ?? "")
      .trim()
      .toLowerCase();
    const openId = String(searchParams.get("openId") ?? "").trim();
    if (!requested && !openId) return;

    const linkKey = `${requested}|${openId}`;
    if (notificationDeepLinkHandledRef.current === linkKey) return;
    notificationDeepLinkHandledRef.current = linkKey;

    const isCategory =
      requested === "category" || requested === "categories";
    const isService = requested === "service" || requested === "services";

    if (isCategory) {
      openRequestedCategory();
    } else if (isService) {
      openRequestedService();
    }

    const clearParams = () => {
      const next = new URLSearchParams(searchParams);
      next.delete("requested");
      next.delete("openId");
      setSearchParams(next, { replace: true });
    };

    if (!openId) {
      clearParams();
      return;
    }

    void (async () => {
      if (isCategory) {
        const { response, category } = await fetchCategoryById(openId);
        if (response && category) {
          AddEditCategoryDialog.show(
            true,
            category,
            openRequestedCategory,
            true
          );
        }
      } else if (isService) {
        const { response, service } = await fetchServiceById(
          openId,
          catalogFranchiseId
        );
        if (response && service) {
          showAddEditServiceDialog(
            true,
            service,
            openRequestedService,
            true
          );
        }
      }
      clearParams();
    })();
  }, [
    searchParams,
    setSearchParams,
    openRequestedCategory,
    openRequestedService,
    catalogFranchiseId,
  ]);

  const categoryColumns = React.useMemo(
    () => [
      {
        Header: "SR No",
        accessor: "serial_no",
        Cell: ({ row }: { row: any }) =>
          (currentPage - 1) * pageSize + row.index + 1,
      },

      { Header: "Category Name", accessor: "name", sort: true },
      {
        Header: franchiseCatalogScope ? "Franchise status" : "Status",
        accessor: catalogListStatusField,
        className: "my-franchise-col-active-toggle",
        Cell: ({ row }: { row: any }) => {
          const cat = row.original as CategoryModel;
          const active = catalogActiveValue(
            cat as unknown as Record<string, unknown>,
            catalogListStatusField
          );
          const cid = recordIdFromRow(row, CATEGORY_ROW_ID_KEYS);
          return (
            <Form.Check
              type="switch"
              id={`svc-mgmt-category-active-${cid}`}
              className={`franchise-status-switch${
                active ? " franchise-status-switch--on" : ""
              }`}
              checked={active}
              aria-label={
                active
                  ? "Active, switch to deactivate"
                  : "Inactive, switch to activate"
              }
              onChange={(e) => {
                e.stopPropagation();
                void setCatalogCategoryActive(cat, e.target.checked);
              }}
              onClick={(e) => e.stopPropagation()}
            />
          );
        },
      },
      {
        Header: "Action",
        accessor: "action",
        Cell: ({ row }: { row: any }) => (
          <CustomActionColumn
            row={row}
            onView={async () => {
              const cid = recordIdFromRow(row, CATEGORY_ROW_ID_KEYS);
              if (!cid) {
                showErrorAlert("Unable to open category: missing identifier.");
                return;
              }
              const { response, category } = await fetchCategoryById(cid);
              AddEditCategoryDialog.show(
                true,
                response && category ? category : row.original,
                () => void refreshTableAfterMutation("box-category"),
                true,
                true
              );
            }}
          />
        ),
      },
    ],
    [
      currentPage,
      pageSize,
      refreshTableAfterMutation,
      franchiseCatalogScope,
      catalogListStatusField,
      setCatalogCategoryActive,
    ]
  );

  const subCategoryColumns = React.useMemo(
    () => [
      {
        Header: "SR No",
        accessor: "serial_no",
        Cell: ({ row }: { row: any }) =>
          (currentPage - 1) * pageSize + row.index + 1,
      },
      { Header: "Sub Category Name", accessor: "name", sort: true },
      { Header: "Category", accessor: "category_name" },
      {
        Header: franchiseCatalogScope ? "Franchise status" : "Status",
        accessor: catalogListStatusField,
        className: "my-franchise-col-active-toggle",
        Cell: ({ row }: { row: any }) => {
          const sub = row.original as SubCategoryRow;
          const active = catalogActiveValue(
            sub as unknown as Record<string, unknown>,
            catalogListStatusField
          );
          const sid = recordIdFromRow(row, SUBCATEGORY_ROW_ID_KEYS);
          return (
            <Form.Check
              type="switch"
              id={`svc-mgmt-subcategory-active-${sid}`}
              className={`franchise-status-switch${
                active ? " franchise-status-switch--on" : ""
              }`}
              checked={active}
              aria-label={
                active
                  ? "Active, switch to deactivate"
                  : "Inactive, switch to activate"
              }
              onChange={(e) => {
                e.stopPropagation();
                setSubCategoryActive(sub, e.target.checked);
              }}
              onClick={(e) => e.stopPropagation()}
            />
          );
        },
      },
      {
        Header: "Action",
        accessor: "action",
        Cell: ({ row }: { row: any }) => (
          <CustomActionColumn
            row={row}
            onView={() => {
              const sid = recordIdFromRow(row, SUBCATEGORY_ROW_ID_KEYS);
              if (!sid) {
                showErrorAlert(
                  "Unable to open sub category: missing identifier."
                );
                return;
              }
              openSubCategoryDialog(row.original as SubCategoryRow, true);
            }}
          />
        ),
      },
    ],
    [
      currentPage,
      pageSize,
      franchiseCatalogScope,
      catalogListStatusField,
      setSubCategoryActive,
      openSubCategoryDialog,
    ]
  );

  const serviceColumns = React.useMemo(
    () => [
      {
        Header: "SR No",
        accessor: "serial_no",
        Cell: ({ row }: { row: any }) =>
          (currentPage - 1) * pageSize + row.index + 1,
      },

      { Header: "Service Name", accessor: "name", sort: true },
      {
        Header: "Sub Category",
        accessor: "subcategory_name",
        Cell: ({ row }: { row: any }) => {
          const o = (row?.original ?? {}) as Record<string, unknown>;
          const label = String(
            o.subcategory_name ??
              o.sub_category_name ??
              o.subcategory ??
              ""
          ).trim();
          return label || "-";
        },
      },
      { Header: "Category", accessor: "category_name" },
      {
        Header: franchiseCatalogScope ? "Franchise status" : "Status",
        accessor: catalogListStatusField,
        className: "my-franchise-col-active-toggle",
        Cell: ({ row }: { row: any }) => {
          const svc = row.original as ServiceModel;
          const active = catalogActiveValue(
            svc as unknown as Record<string, unknown>,
            catalogListStatusField
          );
          const sid = recordIdFromRow(row, SERVICE_ROW_ID_KEYS);
          return (
            <Form.Check
              type="switch"
              id={`svc-mgmt-service-active-${sid}`}
              className={`franchise-status-switch${
                active ? " franchise-status-switch--on" : ""
              }`}
              checked={active}
              aria-label={
                active
                  ? "Active, switch to deactivate"
                  : "Inactive, switch to activate"
              }
              onChange={(e) => {
                e.stopPropagation();
                void setCatalogServiceActive(svc, e.target.checked);
              }}
              onClick={(e) => e.stopPropagation()}
            />
          );
        },
      },
      {
        Header: "Action",
        accessor: "action",
        Cell: ({ row }: { row: any }) => (
          <CustomActionColumn
            row={row}
            onView={async () => {
              const sid = recordIdFromRow(row, SERVICE_ROW_ID_KEYS);
              if (!sid) {
                showErrorAlert("Unable to open service: missing identifier.");
                return;
              }
              const { response, service } = await fetchServiceById(
                sid,
                catalogFranchiseId
              );
              const record =
                response && service
                  ? mergeServiceDetailForDialog(row.original, service)
                  : (row.original as ServiceModel);
              showAddEditServiceDialog(
                true,
                record,
                () => void refreshTableAfterMutation("box-service"),
                true,
                undefined,
                true
              );
            }}
          />
        ),
      },
    ],
    [
      currentPage,
      pageSize,
      refreshTableAfterMutation,
      franchiseCatalogScope,
      catalogListStatusField,
      setCatalogServiceActive,
      catalogFranchiseId,
    ]
  );

  /* ADDED: requested category columns */
  const requestedCategoryColumns = React.useMemo(
    () => [
      {
        Header: "SR No",
        accessor: "serial_no",
        Cell: ({ row }: { row: any }) =>
          (currentPage - 1) * pageSize + row.index + 1,
      },

      { Header: "Category Name", accessor: "name" },
      {
        Header: "Date",
        accessor: "createdAt",
        Cell: ({ row }: { row: any }) =>
          formatDate(row.original.createdAt || row.original.created_at),
      },
      {
        Header: "Status",
        accessor: "status",
        Cell: requestStatusCell(),
      },
      {
        Header: "Action",
        accessor: "action",
        Cell: ({ row }: { row: any }) => (
          <CustomActionColumn
            row={row}
            onView={async () => {
              const cid = recordIdFromRow(row, CATEGORY_ROW_ID_KEYS);
              if (!cid) {
                showErrorAlert("Unable to open category: missing identifier.");
                return;
              }
              const { response, category } = await fetchCategoryById(cid);
              const record =
                response && category
                  ? mergeCategoryDetailForDialog(row.original, category)
                  : row.original;
              AddEditCategoryDialog.show(
                true,
                record,
                openRequestedCategory,
                true
              );
            }}
          />
        ),
      },
    ],
    [openRequestedCategory, currentPage, pageSize]
  );

  /* ADDED: requested service columns */
  const requestedServiceColumns = React.useMemo(
    () => [
      {
        Header: "SR No",
        accessor: "serial_no",
        Cell: ({ row }: { row: any }) =>
          (currentPage - 1) * pageSize + row.index + 1,
      },

      { Header: "Service Name", accessor: "name" },
      { Header: "Category", accessor: "category_name" },
      {
        Header: "Date",
        accessor: "createdAt",
        Cell: ({ row }: { row: any }) =>
          formatDate(row.original.createdAt || row.original.created_at),
      },
      {
        Header: "Status",
        accessor: "status",
        Cell: requestStatusCell(),
      },
      {
        Header: "Action",
        accessor: "action",
        Cell: ({ row }: { row: any }) => (
          <CustomActionColumn
            row={row}
            onView={async () => {
              const sid = recordIdFromRow(row, SERVICE_ROW_ID_KEYS);
              if (!sid) {
                showErrorAlert("Unable to open service: missing identifier.");
                return;
              }
              const { response, service } = await fetchServiceById(
                sid,
                catalogFranchiseId
              );
              const record =
                response && service
                  ? mergeServiceDetailForDialog(row.original, service)
                  : (row.original as ServiceModel);
              showAddEditServiceDialog(
                true,
                record,
                openRequestedService,
                true
              );
            }}
          />
        ),
      },
    ],
    [openRequestedService, currentPage, pageSize, catalogFranchiseId]
  );

  return (
    <>
      <div className="main-page-content">
        <CustomHeader
          title="Service Management"
          register={register}
          setValue={setValue}
        />

        <div className="box-container">
          {["box-category", "box-subcategory", "box-service"].map((id) => (
            <CustomSummaryBox
              key={id}
              divId={id}
              title={capitalizeString(id.replace("box-", "").replace("-", " "))}
              data={
                id === "box-category"
                  ? categoryData
                  : id === "box-subcategory"
                  ? subCategoryData
                  : serviceData
              }
              onSelect={(divId) => {
                setSelectedBox(divId);
                setShowRequestedCategory(false);
                setShowRequestedService(false);
                handleFilterChange({}, divId);
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
              addButtonLable={capitalizeString(
                id.replace("box-", "Add ").replace("-", " ")
              )}
              onAddClick={() => {
                if (id === "box-category") {
                  AddEditCategoryDialog.show(false, null, () =>
                    void refreshTableAfterMutation(selectedBox)
                  );
                  return;
                }
                if (id === "box-subcategory") {
                  openSubCategoryDialog(null, false);
                  return;
                }
                showAddEditServiceDialog(false, null, () =>
                  void refreshTableAfterMutation(selectedBox)
                );
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
              : selectedBox === "box-subcategory"
              ? "Sub Categories"
              : "Services"
          }
          searchHint={`${
            showRequestedCategory
              ? "Search Category name"
              : showRequestedService
              ? "Search Service name"
              : selectedBox === "box-category"
              ? "Search Category name"
              : selectedBox === "box-subcategory"
              ? "Search Sub Category name"
              : "Search Service name, Category"
          }`}
          onSearch={(value) => {
            handleFilterChange({ keyword: value });
          }}
          syncKeyword={activeFilters.keyword ?? ""}
        />

        <CustomTable
          columns={
            showRequestedCategory
              ? requestedCategoryColumns
              : showRequestedService
              ? requestedServiceColumns
              : selectedBox === "box-category"
              ? categoryColumns
              : selectedBox === "box-subcategory"
              ? subCategoryColumns
              : serviceColumns
          }
          data={
            showRequestedCategory
              ? requestedCategoryList
              : showRequestedService
              ? requestedServiceList
              : selectedBox === "box-category"
              ? categoryList
              : selectedBox === "box-subcategory"
              ? pagedSubCategoryList
              : serviceList
          }
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
          onSortChange={(next) => {
            setSortBy(next);
            setCurrentPage(1);
          }}
          isLoading={isTableLoading}
          theadClass="table-light"
        />
      </div>
    </>
  );
};

export default ServiceManagement;
