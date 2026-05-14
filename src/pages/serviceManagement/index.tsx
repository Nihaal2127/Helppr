import React, { useState, useEffect, useCallback, useRef } from "react";
import CustomHeader from "../../components/CustomHeader";
import CustomSummaryBox from "../../components/CustomSummaryBox";
import CustomUtilityBox from "../../components/CustomUtilityBox";
import { capitalizeString, statusCell, formatDate } from "../../helper/utility";
import CustomTable from "../../components/CustomTable";
import AddEditCategoryDialog from "./AddEditCategoryDialog";
import AddEditServiceDialog from "./AddEditServiceDialog";
import { CategoryModel } from "../../models/CategoryModel";
import { ServiceModel } from "../../models/ServiceModel";
import { fetchCategory, fetchCategoryById } from "../../services/categoryService";
import { fetchService, fetchServiceById } from "../../services/servicesService";
import CustomActionColumn from "../../components/CustomActionColumn";
import type { ServerTableSortBy } from "../../helper/serverTableSort";
import {
  useFranchiseHeaderForm,
  useFranchiseScopedGetCount,
} from "../../hooks/useFranchiseScopedGetCount";
import { showErrorAlert } from "../../helper/alertHelper";

const CATEGORY_ROW_ID_KEYS = ["_id", "category_id", "id"] as const;
const SERVICE_ROW_ID_KEYS = ["_id", "service_id", "id"] as const;

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
  const { register, setValue, franchiseId: headerFranchiseId } =
    useFranchiseHeaderForm();
  const { countModel, refresh: refreshSummaryCounts } =
    useFranchiseScopedGetCount({
      type: "service-management",
      franchiseId: headerFranchiseId,
    });
  /** Header franchise ≠ "all" → lists from `GET …/franchise-category|franchise-service/getAll?franchise_id=…` (`all_*` rows use `franchise_active`). */
  const franchiseCatalogScope =
    Boolean(String(headerFranchiseId ?? "").trim()) &&
    String(headerFranchiseId).toLowerCase() !== "all";
  const catalogListStatusField = franchiseCatalogScope
    ? "franchise_active"
    : "is_active";
  const [selectedBox, setSelectedBox] = useState<string>("box-category");
  const [categoryData, setCategoryData] = useState<Record<string, number>>({});
  const [serviceData, setServiceData] = useState<Record<string, number>>({});
  const [categoryList, setCategoryList] = useState<CategoryModel[]>([]);
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
            headerFranchiseId
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
            headerFranchiseId
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
      headerFranchiseId,
    ]
  );

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

  useEffect(() => {
    void refreshData(selectedBox);
  }, [
    selectedBox,
    pageSize,
    currentPage,
    showRequestedCategory,
    showRequestedService,
    refreshData,
    headerFranchiseId,
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
        Header: "Services",
        accessor: "services",
        Cell: ({ row }: { row: any }) => {
          const cat = row.original;

          // Prefer real service names if API provides them; otherwise show a static fallback.
          let names: string[] = [];

          if (Array.isArray(cat.services) && cat.services.length > 0) {
            names = cat.services
              .map((s: any) =>
                typeof s === "object" && s !== null
                  ? String(s.name ?? s.label ?? "")
                  : String(s)
              )
              .filter(Boolean);
          }

          if (
            names.length === 0 &&
            Array.isArray(cat.service_names) &&
            cat.service_names.length > 0
          ) {
            names = cat.service_names
              .map((n: any) =>
                typeof n === "object" && n !== null
                  ? String(n.name ?? n.label ?? "")
                  : String(n)
              )
              .filter(Boolean);
          }

          if (!names || names.length === 0) return "-";
          const hasMoreServices = names.length > 1;
          const additionalCount = names.length - 1;

          return (
            <div className="pin-code-hover-wrapper">
              <span className="pin-code-hover-trigger">
                {hasMoreServices ? (
                  <>
                    {`${names[0]}...`}
                    <span
                      style={{ color: "red" }}
                    >{`+${additionalCount}`}</span>
                  </>
                ) : (
                  names[0]
                )}
              </span>
              <div className="pin-code-hover-card">
                {names.map((n, idx) => (
                  <div key={`${n}-${idx}`} className="pin-code-hover-item">
                    {`• ${n}`}
                  </div>
                ))}
              </div>
            </div>
          );
        },
      },
      {
        Header: franchiseCatalogScope ? "Franchise status" : "Status",
        accessor: catalogListStatusField,
        Cell: statusCell(catalogListStatusField),
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
      { Header: "Category", accessor: "category_name" },
      {
        Header: franchiseCatalogScope ? "Franchise status" : "Status",
        accessor: catalogListStatusField,
        Cell: statusCell(catalogListStatusField),
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
              const { response, service } = await fetchServiceById(sid);
              AddEditServiceDialog.show(
                true,
                response && service ? service : row.original,
                () => void refreshTableAfterMutation("box-service"),
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
    ]
  );

  /* ADDED: requested category columns */
  const requestedCategoryColumns = React.useMemo(
    () => [
      {
        Header: "S.No",
        accessor: "serial_no",
        Cell: ({ row }: { row: any }) => row.index + 1,
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
              AddEditCategoryDialog.show(
                true,
                response && category ? category : row.original,
                openRequestedCategory,
                true
              );
            }}
          />
        ),
      },
    ],
    [openRequestedCategory]
  );

  /* ADDED: requested service columns */
  const requestedServiceColumns = React.useMemo(
    () => [
      {
        Header: "S.No",
        accessor: "serial_no",
        Cell: ({ row }: { row: any }) => row.index + 1,
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
              const { response, service } = await fetchServiceById(sid);
              AddEditServiceDialog.show(
                true,
                response && service ? service : row.original,
                openRequestedService,
                true
              );
            }}
          />
        ),
      },
    ],
    [openRequestedService]
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
                id === "box-category"
                  ? AddEditCategoryDialog.show(false, null, () =>
                      void refreshTableAfterMutation(selectedBox)
                    )
                  : AddEditServiceDialog.show(false, null, () =>
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
              : "Services"
          }
          searchHint={`${
            showRequestedCategory
              ? "Search Category name, Description etc."
              : showRequestedService
              ? "Search Service name, Description etc."
              : selectedBox === "box-category"
              ? "Search Category name, Services"
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
