import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Form } from "react-bootstrap";
import CustomHeader from "../../components/CustomHeader";
import CustomSummaryBox from "../../components/CustomSummaryBox";
import CustomUtilityBox from "../../components/CustomUtilityBox";
import CustomTable from "../../components/CustomTable";
import CustomActionColumn from "../../components/CustomActionColumn";
import { openConfirmDialog } from "../../components/CustomConfirmDialog";
import { showSuccessAlert } from "../../helper/alertHelper";
import { statusCell } from "../../helper/utility";
import { useForm } from "react-hook-form";
import type {
  AreaRow,
  CategoryRow,
  EmployeeRow,
  RequestedCategoryRow,
  RequestedServiceRow,
  ServiceRow,
} from "../../services/myFranchiseService";
import {
  fetchMyFranchiseBoxData,
  setCategoryActive as apiSetCategoryActive,
  setEmployeeChatEnabled as apiSetEmployeeChatEnabled,
  setServiceActive as apiSetServiceActive,
  voidFranchiseEmployee,
  voidRequestedCategory,
  voidRequestedService,
} from "../../services/myFranchiseService";
import FranchiseEmployeeDialog from "./FranchiseEmployeeDialog";
import RequestedCategoryDialog from "./RequestedCategoryDialog";
import RequestedServiceDialog from "./RequestedServiceDialog";

type BoxId = "box-employees" | "box-areas" | "box-services" | "box-categories";

type ServicesViewMode = "catalog" | "requested";

type CategoriesViewMode = "catalog" | "requested";

type FranchiseBoxConfig = {
  id: BoxId;
  title: string;
  data: Record<string, number>;
  isAddShow: boolean;
  addLabel: string;
  onAdd?: () => void;
};

const pendingRequestedStatusCell = () => (
  <span style={{ color: "orange", fontWeight: 600 }}>Pending</span>
);

function normalizeAreaPinCodesFromRow(original: any): string[] {
  const rawPinCodes = original?.pincodes ?? original?.pincode ?? original?.pin_codes ?? [];

  const pinCodes = Array.isArray(rawPinCodes)
    ? rawPinCodes
    : typeof rawPinCodes === "string"
      ? rawPinCodes.split(",")
      : [];

  return pinCodes.map((p: unknown) => String(p).trim()).filter(Boolean);
}

/** Same pattern as `locationManagement/index.tsx` pinCodesCell — uses global `.pin-code-hover-*` styles. */
function franchiseAreasPinCodesCell({ row }: { row: any }) {
  const normalized = normalizeAreaPinCodesFromRow(row?.original);

  if (normalized.length === 0) return "-";

  return (
    <div className="pin-code-hover-wrapper">
      <span className="pin-code-hover-trigger">
        {normalized.length === 1 ? (
          normalized[0]
        ) : (
          <>
            {normalized[0]}...
            <span className="pin-code-more-count"> +{normalized.length - 1}</span>
          </>
        )}
      </span>
      {normalized.length > 1 && (
        <div className="pin-code-hover-card">
          {normalized.map((p: string) => (
            <div key={p} className="pin-code-hover-item">
              {p}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Services column: first name + “...+N”, hover card lists all (matches `serviceManagement` category table). */
function renderCategoryServicesNamesHover(names: (string | undefined)[]): React.ReactNode {
  const list = names.map((n) => String(n ?? "").trim()).filter(Boolean);
  if (list.length === 0) return "-";
  if (list.length === 1) return list[0];
  const additionalCount = list.length - 1;
  return (
    <div className="pin-code-hover-wrapper">
      <span className="pin-code-hover-trigger">
        {`${list[0]}...`}
        <span style={{ color: "red", fontWeight: 600 }}>{`+${additionalCount}`}</span>
      </span>
      <div className="pin-code-hover-card">
        {list.map((n, idx) => (
          <div key={`${n}-${idx}`} className="pin-code-hover-item">
            {`• ${n}`}
          </div>
        ))}
      </div>
    </div>
  );
}

function franchiseRequestedCategoryServicesCell({ row }: { row: any }) {
  const rc = row.original as RequestedCategoryRow;
  return renderCategoryServicesNamesHover(rc.service_names ?? []);
}

function serviceNamesForCatalogCategory(cat: CategoryRow, servicesList: ServiceRow[]): string[] {
  return servicesList.filter((s) => s.category_name === cat.name).map((s) => s.name);
}

const MyFranchise = () => {
  const { register, setValue } = useForm();
  const [selectedBox, setSelectedBox] = useState<BoxId>("box-employees");
  const [servicesViewMode, setServicesViewMode] = useState<ServicesViewMode>("catalog");
  const [categoriesViewMode, setCategoriesViewMode] = useState<CategoriesViewMode>("catalog");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [requestedServices, setRequestedServices] = useState<RequestedServiceRow[]>([]);
  const [requestedCategories, setRequestedCategories] = useState<RequestedCategoryRow[]>([]);

  const reloadFranchiseData = useCallback(async () => {
    const data = await fetchMyFranchiseBoxData();
    setEmployees(
      (data.employees as unknown as EmployeeRow[]).map((e) => ({
        ...e,
        chat_enabled: e.is_active ? (e.chat_enabled ?? true) : false,
      }))
    );
    setAreas(data.areas as unknown as AreaRow[]);
    setServices(data.services as unknown as ServiceRow[]);
    setCategories(data.categories as unknown as CategoryRow[]);
    setRequestedServices(data.requested_services as RequestedServiceRow[]);
    setRequestedCategories(data.requested_categories as RequestedCategoryRow[]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const data = await fetchMyFranchiseBoxData();
      if (cancelled) return;
      setEmployees(
        (data.employees as unknown as EmployeeRow[]).map((e) => ({
          ...e,
          chat_enabled: e.is_active ? (e.chat_enabled ?? true) : false,
        }))
      );
      setAreas(data.areas as unknown as AreaRow[]);
      setServices(data.services as unknown as ServiceRow[]);
      setCategories(data.categories as unknown as CategoryRow[]);
      setRequestedServices(data.requested_services as RequestedServiceRow[]);
      setRequestedCategories(data.requested_categories as RequestedCategoryRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleEmployeeVoid = useCallback(
    (id: string) => {
      openConfirmDialog(
        "Are you sure you want to void this employee? ",
        "Void",
        "Cancel",
        async () => {
          const ok = await voidFranchiseEmployee(id);
          if (ok) {
            showSuccessAlert("Employee voided");
            await reloadFranchiseData();
          }
        }
      );
    },
    [reloadFranchiseData]
  );

  const employeesSummary = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((e) => e.is_active).length;
    return { Total: total, Active: active, Inactive: total - active };
  }, [employees]);

  const areasSummary = useMemo(() => {
    const total = areas.length;
    const active = areas.filter((a) => a.is_active).length;
    return { Total: total, Active: active, Inactive: total - active };
  }, [areas]);

  const servicesSummary = useMemo(() => {
    const total = services.length;
    const active = services.filter((s) => s.is_active).length;
    return {
      Total: total,
      Active: active,
      Inactive: total - active,
      requested_service: requestedServices.length,
    };
  }, [services, requestedServices]);

  const categoriesSummary = useMemo(() => {
    const total = categories.length;
    const active = categories.filter((c) => c.is_active).length;
    return {
      Total: total,
      Active: active,
      Inactive: total - active,
      requested_category: requestedCategories.length,
    };
  }, [categories, requestedCategories]);

  const handleBoxSelect = (divId: string) => {
    setSelectedBox(divId as BoxId);
    setServicesViewMode("catalog");
    setCategoriesViewMode("catalog");
    setStatusFilter(undefined);
    setSearchKeyword("");
    setCurrentPage(1);
  };

  const handleFilterChange = useCallback((filter: { status?: string }) => {
    setStatusFilter(filter.status);
    setServicesViewMode("catalog");
    setCategoriesViewMode("catalog");
    setCurrentPage(1);
  }, []);

  const keyword = searchKeyword.trim().toLowerCase();

  const filteredEmployees = useMemo(() => {
    return employees.filter((row) => {
      const matchesStatus =
        statusFilter == null ||
        (statusFilter === "true" && row.is_active) ||
        (statusFilter === "false" && !row.is_active);
      const hay = [row.employee_id, row.name, row.role, row.phone, row.email, row.area_name]
        .join(" ")
        .toLowerCase();
      const matchesKw = !keyword || hay.includes(keyword);
      return matchesStatus && matchesKw;
    });
  }, [employees, statusFilter, keyword]);

  const filteredAreas = useMemo(() => {
    return areas.filter((row) => {
      const matchesStatus =
        statusFilter == null ||
        (statusFilter === "true" && row.is_active) ||
        (statusFilter === "false" && !row.is_active);
      const pins = normalizeAreaPinCodesFromRow(row);
      const hay = [row.area_name, row.city_name, row.state_name, ...pins].join(" ").toLowerCase();
      const matchesKw = !keyword || hay.includes(keyword);
      return matchesStatus && matchesKw;
    });
  }, [areas, statusFilter, keyword]);

  const filteredServices = useMemo(() => {
    return services.filter((row) => {
      const matchesStatus =
        statusFilter == null ||
        (statusFilter === "true" && row.is_active) ||
        (statusFilter === "false" && !row.is_active);
      const hay = [row.name, row.category_name].join(" ").toLowerCase();
      const matchesKw = !keyword || hay.includes(keyword);
      return matchesStatus && matchesKw;
    });
  }, [services, statusFilter, keyword]);

  const filteredRequestedServices = useMemo(() => {
    return requestedServices.filter((row) => {
      const hay = [row.name, row.category_name].join(" ").toLowerCase();
      return !keyword || hay.includes(keyword);
    });
  }, [requestedServices, keyword]);

  const filteredCategories = useMemo(() => {
    return categories.filter((row) => {
      const matchesStatus =
        statusFilter == null ||
        (statusFilter === "true" && row.is_active) ||
        (statusFilter === "false" && !row.is_active);
      const svcHay = serviceNamesForCatalogCategory(row, services).join(" ").toLowerCase();
      const hay = [row.name, svcHay].join(" ").toLowerCase();
      const matchesKw = !keyword || hay.includes(keyword);
      return matchesStatus && matchesKw;
    });
  }, [categories, services, statusFilter, keyword]);

  const filteredRequestedCategories = useMemo(() => {
    return requestedCategories.filter((row: RequestedCategoryRow) => {
      const hay = [row.name, ...(row.service_names ?? [])].join(" ").toLowerCase();
      return !keyword || hay.includes(keyword);
    });
  }, [requestedCategories, keyword]);

  const activeFilteredList = useMemo(() => {
    switch (selectedBox) {
      case "box-employees":
        return filteredEmployees;
      case "box-areas":
        return filteredAreas;
      case "box-services":
        return servicesViewMode === "requested" ? filteredRequestedServices : filteredServices;
      case "box-categories":
        return categoriesViewMode === "requested" ? filteredRequestedCategories : filteredCategories;
      default:
        return [];
    }
  }, [
    selectedBox,
    servicesViewMode,
    categoriesViewMode,
    filteredEmployees,
    filteredAreas,
    filteredServices,
    filteredRequestedServices,
    filteredCategories,
    filteredRequestedCategories,
  ]);

  const totalPages = useMemo(() => {
    if (!activeFilteredList.length) return 0;
    return Math.ceil(activeFilteredList.length / pageSize);
  }, [activeFilteredList, pageSize]);

  const pagedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return activeFilteredList.slice(start, start + pageSize);
  }, [activeFilteredList, currentPage, pageSize]);

  const setEmployeeChatEnabled = useCallback((id: string, enabled: boolean) => {
    void apiSetEmployeeChatEnabled(id, enabled);
    setEmployees((prev) =>
      prev.map((e) => (e._id === id && e.is_active ? { ...e, chat_enabled: enabled } : e))
    );
    showSuccessAlert("Chat status updated");
  }, []);

  const setServiceActive = (id: string, is_active: boolean) => {
    void apiSetServiceActive(id, is_active);
    setServices((prev) => prev.map((s) => (s._id === id ? { ...s, is_active } : s)));
    showSuccessAlert("Service status updated");
  };

  const setCategoryActive = (id: string, is_active: boolean) => {
    void apiSetCategoryActive(id, is_active);
    setCategories((prev) => prev.map((c) => (c._id === id ? { ...c, is_active } : c)));
    showSuccessAlert("Category status updated");
  };

  const handleRequestedServiceVoid = useCallback(
    (id: string) => {
      openConfirmDialog(
        "Are you sure you want to void this service request?",
        "Void",
        "Cancel",
        async () => {
          const ok = await voidRequestedService(id);
          if (ok) {
            showSuccessAlert("Service request voided");
            await reloadFranchiseData();
          }
        }
      );
    },
    [reloadFranchiseData]
  );

  const handleRequestedCategoryVoid = useCallback(
    (id: string) => {
      openConfirmDialog(
        "Are you sure you want to void this category request?",
        "Void",
        "Cancel",
        async () => {
          const ok = await voidRequestedCategory(id);
          if (ok) {
            showSuccessAlert("Category request voided");
            await reloadFranchiseData();
          }
        }
      );
    },
    [reloadFranchiseData]
  );

  const categorySelectOptions = useMemo(
    () => categories.map((c) => ({ value: c.category_id, label: c.name })),
    [categories]
  );

  const franchiseServiceOptionsForCategoryDialog = useMemo(
    () => services.map((s) => ({ value: s._id, label: s.name })),
    [services]
  );

  const utilityTitle = useMemo(() => {
    switch (selectedBox) {
      case "box-employees":
        return "Employees";
      case "box-areas":
        return "Areas";
      case "box-services":
        return servicesViewMode === "requested" ? "Requested services" : "Services";
      case "box-categories":
        return categoriesViewMode === "requested" ? "Requested categories" : "Categories";
      default:
        return "";
    }
  }, [selectedBox, servicesViewMode, categoriesViewMode]);

  const utilitySearchHint = useMemo(() => {
    switch (selectedBox) {
      case "box-employees":
        return "Search employee name";
      case "box-areas":
        return "Search area or pin code";
      case "box-services":
        return "Search service";
      case "box-categories":
        return "Search category";
      default:
        return "Search";
    }
  }, [selectedBox]);

  const employeeColumns = useMemo(
    () => [
      {
        Header: "SR No",
        accessor: "serial_no",
        className: "my-franchise-col-sr",
        Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
      },
      { Header: "Name", accessor: "name", className: "my-franchise-col-name" },
      { Header: "Phone", accessor: "phone", className: "my-franchise-col-phone" },
      { Header: "Email", accessor: "email", className: "my-franchise-col-email" },
      {
        Header: "Chat",
        accessor: "chat_enabled",
        className: "my-franchise-col-chat",
        Cell: ({ row }: { row: any }) => {
          const emp = row.original as EmployeeRow;
          const chatOn = Boolean(emp.is_active && emp.chat_enabled);
          return (
            <Form.Check
              type="switch"
              id={`franchise-chat-${emp._id}`}
              className="franchise-chat-switch"
              checked={chatOn}
              disabled={!emp.is_active}
              title={emp.is_active ? "Chat on / off" : "Inactive employees cannot use chat"}
              onChange={(e) => {
                e.stopPropagation();
                if (!emp.is_active) return;
                setEmployeeChatEnabled(emp._id, e.target.checked);
              }}
              onClick={(e) => e.stopPropagation()}
            />
          );
        },
      },
      {
        Header: "Status",
        accessor: "is_active",
        className: "my-franchise-col-status",
        Cell: statusCell("is_active"),
      },
      {
        Header: "Action",
        accessor: "action",
        className: "my-franchise-col-actions",
        Cell: ({ row }: { row: any }) => (
          <CustomActionColumn
            row={row}
            onView={(r) => {
              const emp = r.original as EmployeeRow;
              FranchiseEmployeeDialog.showView(emp, () => {
                void reloadFranchiseData();
              });
            }}
            onDelete={(r) => {
              const emp = r.original as EmployeeRow;
              handleEmployeeVoid(emp._id);
            }}
          />
        ),
      },
    ],
    [currentPage, pageSize, setEmployeeChatEnabled, reloadFranchiseData, handleEmployeeVoid]
  );

  const areaColumns = useMemo(
    () => [
      {
        Header: "SR No",
        accessor: "serial_no",
        Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
      },
      { Header: "Area Name", accessor: "area_name" },
      { Header: "City", accessor: "city_name" },
      { Header: "State", accessor: "state_name" },
      {
        Header: "Pin code",
        accessor: "pincodes",
        Cell: franchiseAreasPinCodesCell,
      },
      {
        Header: "Status",
        accessor: "is_active",
        Cell: ({ row }: { row: any }) => (row.original as AreaRow).is_active ? "Active" : "Inactive",
      },
    ],
    [currentPage, pageSize]
  );

  const serviceColumns = useMemo(
    () => [
      {
        Header: "SR No",
        accessor: "serial_no",
        Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
      },
      { Header: "Service Name", accessor: "name" },
      { Header: "Category", accessor: "category_name" },
      {
        Header: "Status",
        accessor: "is_active",
        Cell: ({ row }: { row: any }) => {
          const svc = row.original as ServiceRow;
          return (
            <Form.Select
              size="sm"
              value={svc.is_active ? "active" : "inactive"}
              onChange={(e) => {
                e.stopPropagation();
                setServiceActive(svc._id, e.target.value === "active");
              }}
              style={{ minWidth: "130px" }}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Form.Select>
          );
        },
      },
    ],
    [currentPage, pageSize]
  );

  const requestedServiceColumns = useMemo(
    () => [
      {
        Header: "SR No",
        accessor: "serial_no",
        Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
      },
      { Header: "Service Name", accessor: "name" },
      { Header: "Category", accessor: "category_name" },
      {
        Header: "Status",
        accessor: "status",
        Cell: pendingRequestedStatusCell,
      },
      {
        Header: "Action",
        accessor: "action",
        Cell: ({ row }: { row: any }) => (
          <CustomActionColumn
            row={row}
            onView={(r) => {
              RequestedServiceDialog.showView(r.original as RequestedServiceRow, categorySelectOptions, () => {
                void reloadFranchiseData();
              });
            }}
            onDelete={(r) => {
              handleRequestedServiceVoid((r.original as RequestedServiceRow)._id);
            }}
          />
        ),
      },
    ],
    [currentPage, pageSize, categorySelectOptions, reloadFranchiseData, handleRequestedServiceVoid]
  );

  const requestedCategoryColumns = useMemo(
    () => [
      {
        Header: "SR No",
        accessor: "serial_no",
        Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
      },
      { Header: "Category Name", accessor: "name" },
      {
        Header: "Services",
        accessor: "service_names",
        Cell: franchiseRequestedCategoryServicesCell,
      },
      {
        Header: "Status",
        accessor: "status",
        Cell: pendingRequestedStatusCell,
      },
      {
        Header: "Action",
        accessor: "action",
        Cell: ({ row }: { row: any }) => (
          <CustomActionColumn
            row={row}
            onView={(r) => {
              RequestedCategoryDialog.showView(
                r.original as RequestedCategoryRow,
                franchiseServiceOptionsForCategoryDialog,
                () => {
                  void reloadFranchiseData();
                }
              );
            }}
            onDelete={(r) => {
              handleRequestedCategoryVoid((r.original as RequestedCategoryRow)._id);
            }}
          />
        ),
      },
    ],
    [franchiseServiceOptionsForCategoryDialog, reloadFranchiseData, handleRequestedCategoryVoid]
  );

  const categoryColumns = useMemo(
    () => [
      {
        Header: "SR No",
        accessor: "serial_no",
        Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
      },
      { Header: "Category Name", accessor: "name" },
      {
        Header: "Services",
        accessor: "service_names_display",
        Cell: ({ row }: { row: any }) => {
          const cat = row.original as CategoryRow;
          return renderCategoryServicesNamesHover(serviceNamesForCatalogCategory(cat, services));
        },
      },
      {
        Header: "Status",
        accessor: "is_active",
        Cell: ({ row }: { row: any }) => {
          const cat = row.original as CategoryRow;
          return (
            <Form.Select
              size="sm"
              value={cat.is_active ? "active" : "inactive"}
              onChange={(e) => {
                e.stopPropagation();
                setCategoryActive(cat._id, e.target.value === "active");
              }}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Form.Select>
          );
        },
      },
    ],
    [currentPage, pageSize, services]
  );

  const tableColumns = useMemo(() => {
    switch (selectedBox) {
      case "box-employees":
        return employeeColumns;
      case "box-areas":
        return areaColumns;
      case "box-services":
        return servicesViewMode === "requested" ? requestedServiceColumns : serviceColumns;
      case "box-categories":
        return categoriesViewMode === "requested" ? requestedCategoryColumns : categoryColumns;
      default:
        return employeeColumns;
    }
  }, [
    selectedBox,
    servicesViewMode,
    categoriesViewMode,
    employeeColumns,
    areaColumns,
    serviceColumns,
    requestedServiceColumns,
    categoryColumns,
    requestedCategoryColumns,
  ]);

  const boxConfigs = useMemo((): FranchiseBoxConfig[] => {
    return [
      {
        id: "box-employees",
        title: "Employees",
        data: employeesSummary,
        isAddShow: true,
        addLabel: "Add Employee",
        onAdd: () => {
          FranchiseEmployeeDialog.showAdd(() => {
            void reloadFranchiseData();
          });
        },
      },
      {
        id: "box-areas",
        title: "Areas",
        data: areasSummary,
        isAddShow: false,
        addLabel: "",
      },
      {
        id: "box-services",
        title: "Services",
        data: servicesSummary,
        isAddShow: true,
        addLabel: "Add request",
        onAdd: () => {
          RequestedServiceDialog.showAdd(categorySelectOptions, () => {
            void reloadFranchiseData();
          });
        },
      },
      {
        id: "box-categories",
        title: "Categories",
        data: categoriesSummary,
        isAddShow: true,
        addLabel: "Add request",
        onAdd: () => {
          RequestedCategoryDialog.showAdd(franchiseServiceOptionsForCategoryDialog, () => {
            void reloadFranchiseData();
          });
        },
      },
    ];
  }, [
    employeesSummary,
    areasSummary,
    servicesSummary,
    categoriesSummary,
    categorySelectOptions,
    franchiseServiceOptionsForCategoryDialog,
    reloadFranchiseData,
  ]);

  return (
    <div className="main-page-content my-franchise-page">
      <CustomHeader title="My Franchise" register={register} setValue={setValue} />

      <div className="box-container my-franchise-box-container">
        {boxConfigs.map((cfg) => (
          <CustomSummaryBox
            key={cfg.id}
            divId={cfg.id}
            title={cfg.title}
            data={cfg.data}
            onSelect={(divId) => {
              handleBoxSelect(divId as BoxId);
              handleFilterChange({});
            }}
            isSelected={selectedBox === cfg.id}
            onFilterChange={handleFilterChange}
            isAddShow={cfg.isAddShow}
            addButtonLable={cfg.addLabel}
            onAddClick={cfg.onAdd}
            onItemClick={
              cfg.id === "box-services"
                ? (key) => {
                    if (key === "requested_service") {
                      setSelectedBox("box-services");
                      setServicesViewMode("requested");
                      setStatusFilter(undefined);
                      setCurrentPage(1);
                    }
                  }
                : cfg.id === "box-categories"
                  ? (key) => {
                      if (key === "requested_category") {
                        setSelectedBox("box-categories");
                        setCategoriesViewMode("requested");
                        setStatusFilter(undefined);
                        setCurrentPage(1);
                      }
                    }
                  : undefined
            }
          />
        ))}
      </div>

      <CustomUtilityBox
        title={utilityTitle}
        searchHint={utilitySearchHint}
        hideMoreIcon
        toolsInlineRow
        onDownloadClick={async () => {}}
        onSortClick={() => {}}
        onMoreClick={() => {}}
        onSearch={(value) => {
          setSearchKeyword(value);
          setCurrentPage(1);
        }}
      />

      <div className="my-franchise-table-wrap">
        <CustomTable
          columns={tableColumns}
          data={pagedData}
          pageSize={pageSize}
          currentPage={currentPage}
          totalPages={totalPages}
          horizontalScroll={
            selectedBox !== "box-areas" &&
            !(selectedBox === "box-services" && servicesViewMode === "requested") &&
            !(selectedBox === "box-categories" && categoriesViewMode === "requested")
          }
          onPageChange={(page: number) => setCurrentPage(page)} 
          onLimitChange={(limit: number) => {
            setPageSize(limit);
            setCurrentPage(1);
          }}
          theadClass="table-light"
        />
      </div>
    </div>
  );
};

export default MyFranchise;
