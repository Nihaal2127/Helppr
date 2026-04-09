import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Form } from "react-bootstrap";
import CustomHeader from "../../components/CustomHeader";
import CustomSummaryBox from "../../components/CustomSummaryBox";
import CustomUtilityBox from "../../components/CustomUtilityBox";
import CustomTable from "../../components/CustomTable";
import { showSuccessAlert } from "../../helper/alertHelper";
import { useForm } from "react-hook-form";
import {
  fetchMyFranchiseBoxData,
  setCategoryActive as apiSetCategoryActive,
  setEmployeeActive as apiSetEmployeeActive,
  setServiceActive as apiSetServiceActive,
} from "../../services/myFranchiseService";

type BoxId = "box-employees" | "box-areas" | "box-services" | "box-categories";

type EmployeeRow = {
  _id: string;
  employee_id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  area_name: string;
  is_active: boolean;
};

type AreaRow = {
  _id: string;
  area_name: string;
  city_name: string;
  state_name: string;
  pincode: string;
  is_active: boolean;
};

type ServiceRow = {
  _id: string;
  service_id: string;
  name: string;
  category_name: string;
  is_active: boolean;
};

type CategoryRow = {
  _id: string;
  category_id: string;
  name: string;
  is_active: boolean;
};

// NOTE: Requested services/categories rows were intentionally removed.

const MyFranchise = () => {
  const { register, setValue } = useForm();
  const [selectedBox, setSelectedBox] = useState<BoxId>("box-employees");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await fetchMyFranchiseBoxData();
      if (cancelled) return;
      setEmployees(data.employees as unknown as EmployeeRow[]);
      setAreas(data.areas as unknown as AreaRow[]);
      setServices(data.services as unknown as ServiceRow[]);
      setCategories(data.categories as unknown as CategoryRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
    };
  }, [services]);

  const categoriesSummary = useMemo(() => {
    const total = categories.length;
    const active = categories.filter((c) => c.is_active).length;
    return {
      Total: total,
      Active: active,
      Inactive: total - active,
    };
  }, [categories]);

  const handleBoxSelect = (divId: string) => {
    setSelectedBox(divId as BoxId);
    setStatusFilter(undefined);
    setSearchKeyword("");
    setCurrentPage(1);
  };

  const handleFilterChange = useCallback(
    (filter: { status?: string }) => {
      setStatusFilter(filter.status);
      setCurrentPage(1);
    },
    []
  );

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
      const hay = [row.area_name, row.city_name, row.state_name, row.pincode].join(" ").toLowerCase();
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
      const hay = [row.service_id, row.name, row.category_name].join(" ").toLowerCase();
      const matchesKw = !keyword || hay.includes(keyword);
      return matchesStatus && matchesKw;
    });
  }, [services, statusFilter, keyword]);

  const filteredCategories = useMemo(() => {
    return categories.filter((row) => {
      const matchesStatus =
        statusFilter == null ||
        (statusFilter === "true" && row.is_active) ||
        (statusFilter === "false" && !row.is_active);
      const hay = [row.category_id, row.name].join(" ").toLowerCase();
      const matchesKw = !keyword || hay.includes(keyword);
      return matchesStatus && matchesKw;
    });
  }, [categories, statusFilter, keyword]);

  const activeFilteredList = useMemo(() => {
    switch (selectedBox) {
      case "box-employees":
        return filteredEmployees;
      case "box-areas":
        return filteredAreas;
      case "box-services":
        return filteredServices;
      case "box-categories":
        return filteredCategories;
      default:
        return [];
    }
  }, [selectedBox, filteredEmployees, filteredAreas, filteredServices, filteredCategories]);

  const totalPages = useMemo(() => {
    if (!activeFilteredList.length) return 0;
    return Math.ceil(activeFilteredList.length / pageSize);
  }, [activeFilteredList, pageSize]);

  const pagedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return activeFilteredList.slice(start, start + pageSize);
  }, [activeFilteredList, currentPage, pageSize]);

  const setEmployeeActive = (id: string, is_active: boolean) => {
    void apiSetEmployeeActive(id, is_active);
    setEmployees((prev) => prev.map((e) => (e._id === id ? { ...e, is_active } : e)));
    showSuccessAlert("Employee status updated");
  };

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

  const utilityTitle = useMemo(() => {
    switch (selectedBox) {
      case "box-employees":
        return "Employees";
      case "box-areas":
        return "Areas";
      case "box-services":
        return "Services";
      case "box-categories":
        return "Categories";
      default:
        return "";
    }
  }, [selectedBox]);

  const employeeColumns = useMemo(
    () => [
      {
        Header: "SR No",
        accessor: "serial_no",
        Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
      },
      { Header: "Employee ID", accessor: "employee_id" },
      { Header: "Name", accessor: "name" },
      { Header: "Role", accessor: "role" },
      { Header: "Phone", accessor: "phone" },
      { Header: "Email", accessor: "email" },
      { Header: "Area", accessor: "area_name" },
      {
        Header: "Status",
        accessor: "is_active",
        Cell: ({ row }: { row: any }) => {
          const emp = row.original as EmployeeRow;
          return (
            <Form.Select
              size="sm"
              value={emp.is_active ? "active" : "inactive"}
              onChange={(e) => {
                e.stopPropagation();
                setEmployeeActive(emp._id, e.target.value === "active");
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
      { Header: "Pincode", accessor: "pincode" },
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
      { Header: "Service ID", accessor: "service_id" },
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

  const categoryColumns = useMemo(
    () => [
      {
        Header: "SR No",
        accessor: "serial_no",
        Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
      },
      { Header: "Category ID", accessor: "category_id" },
      { Header: "Category Name", accessor: "name" },
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

  const tableColumns = useMemo(() => {
    switch (selectedBox) {
      case "box-employees":
        return employeeColumns;
      case "box-areas":
        return areaColumns;
      case "box-services":
        return serviceColumns;
      case "box-categories":
        return categoryColumns;
      default:
        return employeeColumns;
    }
  }, [selectedBox, employeeColumns, areaColumns, serviceColumns, categoryColumns]);

  const boxConfigs: {
    id: BoxId;
    title: string;
    data: Record<string, number>;
    isAddShow: boolean;
    addLabel: string;
    onAdd?: () => void;
  }[] = [
    {
      id: "box-employees",
      title: "Employees",
      data: employeesSummary,
      isAddShow: false,
      addLabel: "",
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
      isAddShow: false,
      addLabel: "",
    },
    {
      id: "box-categories",
      title: "Categories",
      data: categoriesSummary,
      isAddShow: false,
      addLabel: "",
    },
  ];

  return (
    <div className="main-page-content">
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
          />
        ))}
      </div>

      <CustomUtilityBox
        title={utilityTitle}
        searchHint="Search name, ID, Description etc."
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

      <CustomTable
        columns={tableColumns}
        data={pagedData}
        pageSize={pageSize}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(page: number) => setCurrentPage(page)}
        onLimitChange={(limit: number) => {
          setPageSize(limit);
          setCurrentPage(1);
        }}
        theadClass="table-light"
      />
    </div>
  );
};

export default MyFranchise;
