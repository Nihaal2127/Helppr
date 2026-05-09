import React, { useState, useEffect, useCallback } from "react";
import CustomHeader from "../../components/CustomHeader";
import CustomSummaryBox from "../../components/CustomSummaryBox";
import CustomUtilityBox from "../../components/CustomUtilityBox";
import { capitalizeString, statusCell, formatDate } from "../../helper/utility";
import CustomTable from "../../components/CustomTable";
import AddEditCategoryDialog from "./AddEditCategoryDialog";
import AddEditServiceDialog from "./AddEditServiceDialog";
import { CategoryModel } from "../../models/CategoryModel";
import { ServiceModel } from "../../models/ServiceModel";
import {
  fetchCategory,
  deleteCategory,
  fetchCategoryById,
} from "../../services/categoryService";
import {
  deleteService,
  fetchService,
  fetchServiceById,
} from "../../services/servicesService";
import CustomActionColumn from "../../components/CustomActionColumn";
import { openConfirmDialog } from "../../components/CustomConfirmDialog";
import { useForm } from "react-hook-form";
import type { ServerTableSortBy } from "../../helper/serverTableSort";
import { getCount } from "../../services/getCountService";

/* ADDED: pending status cell */
const requestStatusCell = () => ({ row }: { row: any }) => {
  const approvalStatus = String(row?.original?.approval_status ?? "")
    .trim()
    .toLowerCase();
  if (approvalStatus === "rejected") {
    return <span style={{ color: "red", fontWeight: 600 }}>Rejected</span>;
  }
  if (approvalStatus === "approve" || approvalStatus === "approved") {
    return <span style={{ color: "green", fontWeight: 600 }}>Approved</span>;
  }
  if (approvalStatus === "pending") {
    return <span style={{ color: "orange", fontWeight: 600 }}>Pending</span>;
  }
  const isRejected = row?.original?.is_rejected;
  if (isRejected === true) {
    return <span style={{ color: "red", fontWeight: 600 }}>Rejected</span>;
  }
  if (isRejected === false) {
    return <span style={{ color: "green", fontWeight: 600 }}>Approved</span>;
  }
  return <span style={{ color: "orange", fontWeight: 600 }}>Pending</span>;
};

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
  const [sortBy, setSortBy] = useState<ServerTableSortBy>([]);
  const inFlightRequestKeysRef = React.useRef<Set<string>>(new Set());

  const refreshCounts = useCallback(async () => {
    // Count endpoint returns true overall totals (not page-based).
    const { responseCount, countModel } = await getCount("service-management");
    if (!responseCount || !countModel) return false;

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
    return true;
  }, []);

  const fetchData = useCallback(
    async (
      selected: string,
      filters: {
        keyword?: string;
        status?: string;
        sort?: string;
      }
    ) => {
      const requestKey = JSON.stringify({
        selected,
        currentPage,
        pageSize,
        filters,
        showRequestedCategory,
        showRequestedService,
        sortBy,
      });
      // Prevent duplicate in-flight calls for same query params (e.g. React StrictMode effect replay).
      if (inFlightRequestKeysRef.current.has(requestKey)) return;
      inFlightRequestKeysRef.current.add(requestKey);

      setIsTableLoading(true);

      try {
        const categoryFilters = {
          ...filters,
          ...(showRequestedCategory ? { is_request: "true" } : {}),
        };
        const serviceFilters = {
          ...filters,
          ...(showRequestedService ? { is_request: "true" } : {}),
        };

        const categorySort = selected === "box-category" ? sortBy : [];
        const serviceSort = selected === "box-service" ? sortBy : [];

        if (selected === "box-category") {
          const catRes = await fetchCategory(
            currentPage,
            pageSize,
            categoryFilters,
            categorySort
          );
          if (catRes.response) {
            const rows = catRes.categories || [];
            if (showRequestedCategory) {
              setRequestedCategoryList(rows);
            } else {
              setCategoryList(rows);
            }
            setTotalPages(catRes.totalPages || 0);
          }
          return;
        }

        const svcRes = await fetchService(
          currentPage,
          pageSize,
          serviceFilters,
          serviceSort
        );
        if (svcRes.response) {
          const rows = svcRes.services || [];
          if (showRequestedService) {
            setRequestedServiceList(rows);
          } else {
            setServiceList(rows);
          }
          setTotalPages(svcRes.totalPages || 0);
        }
      } finally {
        setIsTableLoading(false);
        inFlightRequestKeysRef.current.delete(requestKey);
      }
    },
    [
      currentPage,
      pageSize,
      showRequestedCategory,
      showRequestedService,
      sortBy,
    ]
  );

  const refreshData = useCallback(
    async (selected: string) => {
      await fetchData(selected, activeFilters);
    },
    [fetchData, activeFilters]
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
  ]);

  useEffect(() => {
    void refreshCounts();
  }, [refreshCounts]);

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
    setTotalPages(0);
    setSortBy([]);
    setActiveFilters({});
  }, []);

  /* ADDED: open requested service table */
  const openRequestedService = useCallback(() => {
    setSelectedBox("box-service");
    setShowRequestedService(true);
    setShowRequestedCategory(false);
    setCurrentPage(1);
    setTotalPages(0);
    setSortBy([]);
    setActiveFilters({});
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
          const countDisplay = "-";

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

          if (!names || names.length === 0) return countDisplay;
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
      // { Header: "Partners", accessor: "helpers", Cell: partnerCountCell },
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
            onView={async () => {
              const { response, category } = await fetchCategoryById(
                row.original._id
              );
              AddEditCategoryDialog.show(
                true,
                response && category ? category : row.original,
                () => refreshData("box-category"),
                true
              );
            }}
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
    ],
    [currentPage, pageSize, refreshData]
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
            onView={async () => {
              const { response, service } = await fetchServiceById(
                row.original._id
              );
              AddEditServiceDialog.show(
                true,
                response && service ? service : row.original,
                () => refreshData("box-service"),
                true
              );
            }}
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
    ],
    [currentPage, pageSize, refreshData]
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
      // { Header: "Description", accessor: "desc" },
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
              const { response, category } = await fetchCategoryById(
                row.original._id
              );
              AddEditCategoryDialog.show(
                true,
                response && category ? category : row.original,
                openRequestedCategory,
                true
              );
            }}
            // onEdit={() => {
            //     AddEditCategoryDialog.show(true, row.original, openRequestedCategory);
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
    ],
    [openRequestedCategory, refreshData]
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
      // { Header: "Description", accessor: "desc" },
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
              const { response, service } = await fetchServiceById(
                row.original._id
              );
              AddEditServiceDialog.show(
                true,
                response && service ? service : row.original,
                openRequestedService,
                true
              );
            }}
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
    ],
    [openRequestedService, refreshData]
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
                // Select only; avoid resetting filters twice (row-click already triggers filter change).
                if (divId === selectedBox) return;
                setSelectedBox(divId);
                setShowRequestedCategory(false);
                setShowRequestedService(false);
                setCurrentPage(1);
                setTotalPages(0);
                setSortBy([]);
                setActiveFilters({});
              }}
              isSelected={selectedBox === id}
              onFilterChange={(filter) => {
                // Clicking Total/Active/Inactive should operate on overall list, not requested-only mode.
                if (id === "box-category") {
                  setShowRequestedCategory(false);
                }
                if (id === "box-service") {
                  setShowRequestedService(false);
                }
                handleFilterChange(filter, id);
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
                      refreshData(selectedBox)
                    )
                  : AddEditServiceDialog.show(false, null, () =>
                      refreshData(selectedBox)
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
