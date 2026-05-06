import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";
import { useForm } from "react-hook-form";
import CustomImageUploader from "../../../components/CustomImageUploader";
import CustomHeader from "../../../components/CustomHeader";
import SettingsNav from "../../../components/SettingsNav";
import CustomTable from "../../../components/CustomTable";
import CustomUtilityBox from "../../../components/CustomUtilityBox";
import CustomActionColumn from "../../../components/CustomActionColumn";
import CustomSummaryBox from "../../../components/CustomSummaryBox";
import { CustomFormInput } from "../../../components/CustomFormInput";
import CustomFormSelect from "../../../components/CustomFormSelect";
import { DetailsRow, FullDetailsRow } from "../../../helper/utility";
import {
  RoleSettingsModel,
  StaffSettingsModel,
} from "../../../models/SettingsModel";
import {
  ensureSettingsSeedData,
  createRoleUserWithApi,
  createStaffUserWithApi,
  updateRoleUserWithApi,
  updateStaffUserWithApi,
  fetchSettingsSectionPageByType,
  voidRole,
} from "../../../services/settingsService";
import CustomCloseButton from "../../../components/CustomCloseButton";
import { openConfirmDialog } from "../../../components/CustomConfirmDialog";
import { showErrorAlert } from "../../../helper/alertHelper";
import { mainMenuItems } from "../../../layout/menuItems";
import {
  getFranchiseEmployeeScreenMenuItems,
  isFranchiseEmployeeExcludedScreenKey,
  labelForFranchiseEmployeeScreenKey,
} from "../../../layout/franchiseEmployeeScreenPermissions";
import { AppConstant, UserRole } from "../../../constant/AppConstant";
import { getLocalStorage } from "../../../helper/localStorageHelper";
import profilePlaceholder from "../../../assets/icons/profile.svg";
import { WEB_MANAGEMENT_USER_TYPE } from "../../../services/userService";
import {
  fetchFranchiseDropDown,
  FranchiseDropDownOption,
} from "../../../services/franchiseService";
import type { ServerTableSortBy } from "../../../helper/serverTableSort";

const emptyRoleForm = {
  roleName: "",
  email: "",
  phone_number: "",
  profile_url: "",
  roleType: "franchise_admin" as "franchise_admin" | "employee",
  assignedFranchise: "",
  status: "active" as "active" | "inactive",
  screenPermissions: [] as string[],
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (v: string) => EMAIL_PATTERN.test(v.trim());
const isValidPhone10 = (v: string) => /^\d{10}$/.test(v.trim());
const toLocalPhone10Digits = (phone?: string) => {
  const digits = String(phone ?? "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
};

const employeeScreenPermissionMenuItems = getFranchiseEmployeeScreenMenuItems();
const staffScreenPermissionMenuItems = mainMenuItems.filter(
  ({ key }) => key !== "my-franchise"
);

const emptyStaffForm = {
  name: "",
  email: "",
  phone_number: "",
  profile_url: "",
  status: "active" as "active" | "inactive",
  screenPermissions: [] as string[],
  allFranchises: true,
  franchisePermissions: [] as string[],
};

/** Profile image for franchise/staff role view: backend path or absolute URL; mock `uploads/…` uses placeholder. */
function franchiseRoleProfileImageSrc(profileUrl?: string): string {
  const u = (profileUrl ?? "").trim();
  if (!u) return profilePlaceholder;
  if (
    u.startsWith("http://") ||
    u.startsWith("https://") ||
    u.startsWith("data:")
  )
    return u;
  if (u.startsWith("uploads/")) return profilePlaceholder;
  return `${AppConstant.IMAGE_BASE_URL}${u}?t=${Date.now()}`;
}

const staffFranchiseSummary = (s: StaffSettingsModel) =>
  s.allFranchises
    ? "All franchises"
    : s.franchisePermissions.length
    ? s.franchisePermissions.join(", ")
    : "-";

type SummaryCounts = {
  total: number;
  active: number;
  inactive: number;
};

const EMPTY_SUMMARY_COUNTS: SummaryCounts = {
  total: 0,
  active: 0,
  inactive: 0,
};

const compareNullableText = (a?: string, b?: string) =>
  (a ?? "").localeCompare(b ?? "", undefined, { sensitivity: "base" });

function applyRoleSortFallback(
  rows: RoleSettingsModel[],
  sortBy: ServerTableSortBy
): RoleSettingsModel[] {
  const primarySort = sortBy[0];
  if (!primarySort) return rows;
  if (primarySort.id !== "roleName" && primarySort.id !== "email") return rows;
  const dir = primarySort.desc ? -1 : 1;
  const sorted = [...rows].sort((left, right) => {
    const base =
      primarySort.id === "roleName"
        ? compareNullableText(left.roleName, right.roleName)
        : compareNullableText(left.email, right.email);
    return base * dir;
  });
  return sorted;
}

function applyStaffSortFallback(
  rows: StaffSettingsModel[],
  sortBy: ServerTableSortBy
): StaffSettingsModel[] {
  const primarySort = sortBy[0];
  if (!primarySort) return rows;
  if (primarySort.id !== "name" && primarySort.id !== "email") return rows;
  const dir = primarySort.desc ? -1 : 1;
  const sorted = [...rows].sort((left, right) => {
    const base =
      primarySort.id === "name"
        ? compareNullableText(left.name, right.name)
        : compareNullableText(left.email, right.email);
    return base * dir;
  });
  return sorted;
}

const RoleManagement = () => {
  const SETTINGS_ROLE_PAGE_SIZE = 10;
  const { register, setValue } = useForm<any>();
  const isFranchiseAdminSession =
    getLocalStorage(AppConstant.userRole) === UserRole.FRANCHISE_ADMIN;
  const [items, setItems] = useState<RoleSettingsModel[]>([]);
  const [keyword, setKeyword] = useState("");
  const [roleType, setRoleType] = useState<
    "all" | "franchise_admin" | "employee"
  >(() => (isFranchiseAdminSession ? "employee" : "franchise_admin"));
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [franchiseFilter, setFranchiseFilter] = useState("all");
  const [utilitySearchKey, setUtilitySearchKey] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RoleSettingsModel | null>(null);
  const [form, setForm] = useState(emptyRoleForm);
  const [isViewMode, setIsViewMode] = useState(false);
  const [selectedBox, setSelectedBox] = useState(() =>
    isFranchiseAdminSession ? "box-employee" : "box-franchise-admin"
  );

  const [staffItems, setStaffItems] = useState<StaffSettingsModel[]>([]);
  const [staffKeyword, setStaffKeyword] = useState("");
  const [staffStatus, setStaffStatus] = useState<"all" | "active" | "inactive">(
    "all"
  );
  const [staffUtilityKey, setStaffUtilityKey] = useState(0);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffEditing, setStaffEditing] = useState<StaffSettingsModel | null>(
    null
  );
  const [staffForm, setStaffForm] = useState(emptyStaffForm);
  const [staffIsViewMode, setStaffIsViewMode] = useState(false);
  const [roleSavePending, setRoleSavePending] = useState(false);
  const [staffSavePending, setStaffSavePending] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [roleCurrentPage, setRoleCurrentPage] = useState(1);
  const [roleTotalPages, setRoleTotalPages] = useState(1);
  const [staffCurrentPage, setStaffCurrentPage] = useState(1);
  const [staffTotalPages, setStaffTotalPages] = useState(1);
  const [roleSortBy, setRoleSortBy] = useState<ServerTableSortBy>([]);
  const [staffSortBy, setStaffSortBy] = useState<ServerTableSortBy>([]);
  const [franchiseDropdownOptions, setFranchiseDropdownOptions] = useState<
    FranchiseDropDownOption[]
  >([]);
  const [roleImageFile, setRoleImageFile] = useState<File | null>(null);
  const [staffImageFile, setStaffImageFile] = useState<File | null>(null);
  const [franchiseAdminSummaryCounts, setFranchiseAdminSummaryCounts] =
    useState<SummaryCounts>(EMPTY_SUMMARY_COUNTS);
  const [employeeSummaryCounts, setEmployeeSummaryCounts] =
    useState<SummaryCounts>(EMPTY_SUMMARY_COUNTS);
  const [staffSummaryCounts, setStaffSummaryCounts] =
    useState<SummaryCounts>(EMPTY_SUMMARY_COUNTS);

  const openFormWithData = useCallback(
    (item?: RoleSettingsModel, viewMode = false) => {
      if (!item) {
        setEditing(null);
        setForm(emptyRoleForm);
        setRoleImageFile(null);
        setIsViewMode(false);
        setShowForm(true);
        return;
      }
      setEditing(item);
      setIsViewMode(viewMode);
      const rawPerms = item.screenPermissions?.length
        ? [...item.screenPermissions]
        : [];
      setForm({
        roleName: item.roleName,
        email: item.email ?? "",
        phone_number: item.phone_number ?? "",
        profile_url: item.profile_url ?? "",
        roleType: item.roleType,
        assignedFranchise: item.assignedFranchise || "",
        status: item.status,
        screenPermissions:
          item.roleType === "employee"
            ? rawPerms.filter((k) => !isFranchiseEmployeeExcludedScreenKey(k))
            : rawPerms,
      });
      setShowForm(true);
      setRoleImageFile(null);
    },
    []
  );

  const openStaffWithData = useCallback(
    (item?: StaffSettingsModel, viewMode = false) => {
      if (!item) {
        setStaffEditing(null);
        setStaffForm({ ...emptyStaffForm });
        setStaffImageFile(null);
        setStaffIsViewMode(false);
        setShowStaffModal(true);
        return;
      }
      setStaffEditing(item);
      setStaffIsViewMode(viewMode);
      setStaffForm({
        name: item.name,
        email: item.email ?? "",
        phone_number: item.phone_number ?? "",
        profile_url: item.profile_url ?? "",
        status: item.status,
        screenPermissions: item.screenPermissions?.length
          ? item.screenPermissions.filter((k) => k !== "my-franchise")
          : [],
        allFranchises: item.allFranchises,
        franchisePermissions: item.franchisePermissions?.length
          ? [...item.franchisePermissions]
          : [],
      });
      setShowStaffModal(true);
      setStaffImageFile(null);
    },
    []
  );

  useEffect(() => {
    if (!showForm || !editing) return;
    const rawPerms = editing.screenPermissions?.length
      ? [...editing.screenPermissions]
      : [];
    setForm({
      roleName: editing.roleName,
      email: editing.email ?? "",
      phone_number: toLocalPhone10Digits(editing.phone_number),
      profile_url: editing.profile_url ?? "",
      roleType: editing.roleType,
      assignedFranchise: editing.assignedFranchise || "",
      status: editing.status,
      screenPermissions:
        editing.roleType === "employee"
          ? rawPerms.filter((k) => !isFranchiseEmployeeExcludedScreenKey(k))
          : rawPerms,
    });
    setRoleImageFile(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when modal opens / role id changes; avoid resetting on unrelated `editing` churn
  }, [showForm, editing?.id]);

  useEffect(() => {
    if (!showStaffModal || !staffEditing) return;
    setStaffForm({
      name: staffEditing.name,
      email: staffEditing.email ?? "",
      phone_number: toLocalPhone10Digits(staffEditing.phone_number),
      profile_url: staffEditing.profile_url ?? "",
      status: staffEditing.status,
      screenPermissions: staffEditing.screenPermissions?.length
        ? staffEditing.screenPermissions.filter((k) => k !== "my-franchise")
        : [],
      allFranchises: staffEditing.allFranchises,
      franchisePermissions: staffEditing.franchisePermissions?.length
        ? [...staffEditing.franchisePermissions]
        : [],
    });
    setStaffImageFile(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- same pattern as role modal above
  }, [showStaffModal, staffEditing?.id]);

  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    ensureSettingsSeedData();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const options = await fetchFranchiseDropDown();
      if (cancelled) return;
      setFranchiseDropdownOptions(options);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setInitialLoadDone(true);
  }, []);

  useEffect(() => {
    if (!initialLoadDone) return;
    let cancelled = false;

    const fetchCountsForType = async (
      type: number,
      setter: React.Dispatch<React.SetStateAction<SummaryCounts>>
    ) => {
      const [allRes, activeRes, inactiveRes] = await Promise.all([
        fetchSettingsSectionPageByType(type, 1, 1, { status: "all" }),
        fetchSettingsSectionPageByType(type, 1, 1, { status: "active" }),
        fetchSettingsSectionPageByType(type, 1, 1, { status: "inactive" }),
      ]);
      if (cancelled) return;
      setter({
        total: allRes?.totalItems ?? 0,
        active: activeRes?.totalItems ?? 0,
        inactive: inactiveRes?.totalItems ?? 0,
      });
    };

    void Promise.all([
      fetchCountsForType(
        WEB_MANAGEMENT_USER_TYPE.FRANCHISE_ADMIN,
        setFranchiseAdminSummaryCounts
      ),
      fetchCountsForType(
        WEB_MANAGEMENT_USER_TYPE.FRANCHISE_EMPLOYEE,
        setEmployeeSummaryCounts
      ),
      fetchCountsForType(WEB_MANAGEMENT_USER_TYPE.STAFF, setStaffSummaryCounts),
    ]);

    return () => {
      cancelled = true;
    };
  }, [initialLoadDone, reloadToken]);

  const loadCurrentSectionPage = useCallback(async () => {
    if (!initialLoadDone) return;
    let cancelled = false;
    await (async () => {
      const type =
        selectedBox === "box-staff"
          ? WEB_MANAGEMENT_USER_TYPE.STAFF
          : selectedBox === "box-franchise-admin"
          ? WEB_MANAGEMENT_USER_TYPE.FRANCHISE_ADMIN
          : WEB_MANAGEMENT_USER_TYPE.FRANCHISE_EMPLOYEE;
      const apiData = await fetchSettingsSectionPageByType(
        type,
        selectedBox === "box-staff" ? staffCurrentPage : roleCurrentPage,
        SETTINGS_ROLE_PAGE_SIZE,
        selectedBox === "box-staff"
          ? { keyword: staffKeyword, status: staffStatus }
          : { keyword, status },
        selectedBox === "box-staff" ? staffSortBy : roleSortBy
      );
      if (cancelled) return;
      if (!apiData) {
        if (selectedBox === "box-staff") {
          setStaffItems([]);
          setStaffTotalPages(1);
        } else {
          const targetRoleType =
            selectedBox === "box-franchise-admin"
              ? "franchise_admin"
              : "employee";
          setItems((prev) => prev.filter((r) => r.roleType !== targetRoleType));
          setRoleTotalPages(1);
        }
        return;
      }
      if (selectedBox === "box-staff") {
        setStaffItems(apiData.staff);
        setStaffTotalPages(Math.max(1, apiData.totalPages || 1));
      } else {
        const targetRoleType =
          selectedBox === "box-franchise-admin"
            ? "franchise_admin"
            : "employee";
        setItems((prev) => {
          const other = prev.filter((r) => r.roleType !== targetRoleType);
          const current = apiData.roles.filter(
            (r) => r.roleType === targetRoleType
          );
          return [...other, ...current];
        });
        setRoleTotalPages(Math.max(1, apiData.totalPages || 1));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    initialLoadDone,
    selectedBox,
    roleCurrentPage,
    staffCurrentPage,
    keyword,
    status,
    staffKeyword,
    staffStatus,
    roleSortBy,
    staffSortBy,
  ]);

  useEffect(() => {
    void loadCurrentSectionPage();
  }, [loadCurrentSectionPage, reloadToken]);

  const franchiseNameById = useMemo(() => {
    const map = new Map<string, string>();
    franchiseDropdownOptions.forEach((option) => {
      map.set(String(option.value), option.label);
    });
    return map;
  }, [franchiseDropdownOptions]);

  const roleRows = useMemo(
    () =>
      applyRoleSortFallback(
        items.map((item) => ({
          ...item,
          assignedFranchise:
            item.assignedFranchise ||
            (item.franchise_id
              ? franchiseNameById.get(String(item.franchise_id))
              : undefined) ||
            "",
        })),
        roleSortBy
      ),
    [items, franchiseNameById, roleSortBy]
  );

  const filtered = useMemo(() => {
    return roleRows.filter((item) => {
      // Keyword and status are already applied on backend (`/user/getAll` query params).
      const matchesType = roleType === "all" || item.roleType === roleType;
      const matchesFranchise =
        franchiseFilter === "all" ||
        (item.assignedFranchise || "") === franchiseFilter;
      return matchesType && matchesFranchise;
    });
  }, [roleRows, roleType, franchiseFilter]);

  const isStaffSection = selectedBox === "box-staff";

  const staffFiltered = useMemo(() => {
    // Keyword and status are already applied on backend (`/user/getAll` query params).
    return applyStaffSortFallback(staffItems, staffSortBy);
  }, [staffItems, staffSortBy]);

  const franchiseAdminSummaryData = useMemo(
    () => ({
      Total: franchiseAdminSummaryCounts.total,
      Active: franchiseAdminSummaryCounts.active,
      Inactive: franchiseAdminSummaryCounts.inactive,
    }),
    [franchiseAdminSummaryCounts]
  );

  const employeeSummaryData = useMemo(
    () => ({
      Total: employeeSummaryCounts.total,
      Active: employeeSummaryCounts.active,
      Inactive: employeeSummaryCounts.inactive,
    }),
    [employeeSummaryCounts]
  );

  const staffSummaryData = useMemo(
    () => ({
      Total: staffSummaryCounts.total,
      Active: staffSummaryCounts.active,
      Inactive: staffSummaryCounts.inactive,
    }),
    [staffSummaryCounts]
  );

  const assignedFranchiseOptions = useMemo(() => {
    const uniqueFranchises = Array.from(
      new Set(franchiseDropdownOptions.map((option) => option.label))
    );

    const options = uniqueFranchises.map((franchise) => ({
      value: franchise,
      label: franchise,
    }));

    if (
      form.assignedFranchise &&
      !uniqueFranchises.includes(form.assignedFranchise)
    ) {
      options.unshift({
        value: form.assignedFranchise,
        label: form.assignedFranchise,
      });
    }

    return [{ value: "", label: "Select Franchise" }, ...options];
  }, [franchiseDropdownOptions, form.assignedFranchise]);

  const franchiseMetaByName = useMemo(() => {
    const map = new Map<string, FranchiseDropDownOption>();
    franchiseDropdownOptions.forEach((option) => {
      if (!map.has(option.label)) {
        map.set(option.label, option);
      }
    });
    return map;
  }, [franchiseDropdownOptions]);

  const franchiseFilterOptions = useMemo(() => {
    const uniqueFranchises = Array.from(
      new Set(franchiseDropdownOptions.map((option) => option.label))
    ).sort((a, b) => a.localeCompare(b));

    return [
      { value: "all", label: "All Franchises" },
      ...uniqueFranchises.map((franchise) => ({
        value: franchise,
        label: franchise,
      })),
    ];
  }, [franchiseDropdownOptions]);

  const columns = React.useMemo(
    () => [
      {
        Header: "SR No",
        accessor: "sr",
        Cell: ({ row }: any) => row.index + 1,
      },
      // {
      //   Header: "Id",
      //   accessor: "roleId",
      //   Cell: textUnderlineCell("roleId", (row) => openFormWithData(row, true)),
      // },
      { Header: "Name", accessor: "roleName", sort: true },
      {
        Header: "Email",
        accessor: "email",
        sort: true,
        Cell: ({ row }: any) => row.original.email || "-",
      },
      {
        Header: "Phone",
        accessor: "phone_number",
        Cell: ({ row }: any) => row.original.phone_number || "-",
      },
      {
        Header: "Assigned Franchise",
        accessor: "assignedFranchise",
        Cell: ({ row }: any) => row.original.assignedFranchise || "-",
      },
      {
        Header: "Status",
        accessor: "status",
        Cell: ({ row }: any) => (
          <span
            className={
              row.original.status === "active"
                ? "custom-active"
                : "custom-inactive"
            }
          >
            {row.original.status === "active" ? "Active" : "Inactive"}
          </span>
        ),
      },
      {
        Header: "Action",
        accessor: "action",
        Cell: ({ row }: any) => (
          <CustomActionColumn
            row={row}
            onView={() => openFormWithData(row.original, true)}
            onEdit={() => openFormWithData(row.original, false)}
            onDelete={() => {
              openConfirmDialog(
                "Are you sure you want to void this role?",
                "Void",
                "Cancel",
                () => {
                  voidRole(row.original.id);
                  setReloadToken((v) => v + 1);
                }
              );
            }}
          />
        ),
      },
    ],
    [openFormWithData]
  );

  const staffColumns = React.useMemo(
    () => [
      { Header: "S.no", accessor: "sr", Cell: ({ row }: any) => row.index + 1 },
      // {
      //   Header: "ID",
      //   accessor: "staffId",
      //   Cell: textUnderlineCell("staffId", (row) => openStaffWithData(row, true)),
      // },
      { Header: "Name", accessor: "name", sort: true },
      {
        Header: "Email",
        accessor: "email",
        sort: true,
        Cell: ({ row }: any) => row.original.email || "-",
      },
      {
        Header: "Phone",
        accessor: "phone_number",
        Cell: ({ row }: any) => row.original.phone_number || "-",
      },
      {
        Header: "Status",
        accessor: "status",
        Cell: ({ row }: any) => (
          <span
            className={
              row.original.status === "active"
                ? "custom-active"
                : "custom-inactive"
            }
          >
            {row.original.status === "active" ? "Active" : "Inactive"}
          </span>
        ),
      },
      {
        Header: "Action",
        accessor: "action",
        Cell: ({ row }: any) => (
          <CustomActionColumn
            row={row}
            onView={() => openStaffWithData(row.original, true)}
            onEdit={() => openStaffWithData(row.original, false)}
          />
        ),
      },
    ],
    [openStaffWithData]
  );

  const clearFiltersDisabled =
    !keyword.trim() && status === "all" && franchiseFilter === "all";

  const clearRoleFilters = () => {
    setKeyword("");
    setStatus("all");
    setFranchiseFilter("all");
    setRoleCurrentPage(1);
    setUtilitySearchKey((k) => k + 1);
  };

  const clearStaffFiltersDisabled =
    !staffKeyword.trim() && staffStatus === "all";

  const clearStaffFilters = () => {
    setStaffKeyword("");
    setStaffStatus("all");
    setStaffCurrentPage(1);
    setStaffUtilityKey((k) => k + 1);
  };

  const toggleScreenPermission = (key: string) => {
    setForm((prev) => {
      const next = new Set(prev.screenPermissions);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...prev, screenPermissions: Array.from(next) };
    });
  };

  const toggleStaffScreenPermission = (key: string) => {
    setStaffForm((prev) => {
      const next = new Set(prev.screenPermissions);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...prev, screenPermissions: Array.from(next) };
    });
  };

  return (
    <div className="main-page-content">
      <CustomHeader
        title="Management Roles"
        titlePrefix={<SettingsNav />}
        register={register}
        setValue={setValue}
      />

      <div className="box-container settings-role-box-container">
        {!isFranchiseAdminSession && (
          <CustomSummaryBox
            divId="box-franchise-admin"
            title="Franchise Admin"
            data={franchiseAdminSummaryData}
            onSelect={(divId) => {
              setSelectedBox(divId);
              setRoleType("franchise_admin");
              setRoleCurrentPage(1);
            }}
            isSelected={selectedBox === "box-franchise-admin"}
            onFilterChange={(filter) => {
              setRoleType("franchise_admin");
              if (filter.status === "true") setStatus("active");
              else if (filter.status === "false") setStatus("inactive");
              else setStatus("all");
            }}
            isAddShow={true}
            addButtonLable="Add"
            onAddClick={() => {
              setEditing(null);
              setIsViewMode(false);
              setForm({ ...emptyRoleForm, roleType: "franchise_admin" });
              setRoleImageFile(null);
              setShowForm(true);
            }}
          />
        )}

        <CustomSummaryBox
          divId="box-employee"
          title="Franchise Employee"
          data={employeeSummaryData}
          onSelect={(divId) => {
            setSelectedBox(divId);
            setRoleType("employee");
            setRoleCurrentPage(1);
          }}
          isSelected={selectedBox === "box-employee"}
          onFilterChange={(filter) => {
            setRoleType("employee");
            if (filter.status === "true") setStatus("active");
            else if (filter.status === "false") setStatus("inactive");
            else setStatus("all");
          }}
          isAddShow={true}
          addButtonLable="Add"
          onAddClick={() => {
            setEditing(null);
            setIsViewMode(false);
            setForm({ ...emptyRoleForm, roleType: "employee" });
            setRoleImageFile(null);
            setShowForm(true);
          }}
        />

        {!isFranchiseAdminSession && (
          <CustomSummaryBox
            className="box-staff-card"
            divId="box-staff"
            title="Staff"
            data={staffSummaryData}
            onSelect={(divId) => {
              setSelectedBox(divId);
              setStaffCurrentPage(1);
            }}
            isSelected={selectedBox === "box-staff"}
            onFilterChange={(filter) => {
              setSelectedBox("box-staff");
              if (filter.status === "true") setStaffStatus("active");
              else if (filter.status === "false") setStaffStatus("inactive");
              else setStaffStatus("all");
            }}
            isAddShow={true}
            addButtonLable="Add"
            onAddClick={() => {
              setStaffEditing(null);
              setStaffIsViewMode(false);
              setStaffForm({ ...emptyStaffForm });
              setStaffImageFile(null);
              setShowStaffModal(true);
            }}
          />
        )}
      </div>

      {isStaffSection ? (
        <div className="staff-settings-utility">
          <CustomUtilityBox
            key={`staff-utility-${staffUtilityKey}`}
            title="Staff"
            searchHint="Search Name, Email, Phone Number"
            toolsInlineRow
            afterSearchSlot={
              <Button
                variant="outline-secondary"
                size="sm"
                className="custom-btn-secondary partner-payout-clear-btn px-3"
                type="button"
                disabled={clearStaffFiltersDisabled}
                onClick={clearStaffFilters}
              >
                Clear
              </Button>
            }
            controlSlot={
              <div style={{ width: "190px", minWidth: "190px" }}>
                <CustomFormSelect
                  label="Status"
                  controlId="staff_status_filter"
                  options={[
                    { value: "all", label: "All" },
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                  ]}
                  register={register}
                  fieldName="staff_status_filter"
                  asCol={false}
                  noBottomMargin
                  defaultValue={staffStatus}
                  setValue={setValue}
                  onChange={(e) => {
                    setStaffStatus(
                      e.target.value as "all" | "active" | "inactive"
                    );
                    setStaffCurrentPage(1);
                  }}
                />
              </div>
            }
            onSearch={(value) => {
              setStaffKeyword(value);
              setStaffCurrentPage(1);
            }}
            hideUtilityActions
            hideMoreIcon={true}
          />
        </div>
      ) : (
        <CustomUtilityBox
          key={`role-utility-${utilitySearchKey}`}
          title={`${
            selectedBox === "box-franchise-admin"
              ? "Franchise Admin"
              : "Franchise Employee"
          }`}
          searchHint="Search Name, Email, Phone Number"
          toolsInlineRow
          afterSearchSlot={
            <Button
              variant="outline-secondary"
              size="sm"
              className="custom-btn-secondary partner-payout-clear-btn px-3"
              type="button"
              disabled={clearFiltersDisabled}
              onClick={clearRoleFilters}
            >
              Clear
            </Button>
          }
          controlSlot={
            <>
              <div style={{ width: "190px", minWidth: "190px" }}>
                <CustomFormSelect
                  label="Status"
                  controlId="role_status_filter"
                  options={[
                    { value: "all", label: "All" },
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                  ]}
                  register={register}
                  fieldName="role_status_filter"
                  asCol={false}
                  noBottomMargin
                  defaultValue={status}
                  setValue={setValue}
                  onChange={(e) => {
                    setStatus(e.target.value as "all" | "active" | "inactive");
                    setRoleCurrentPage(1);
                  }}
                />
              </div>
              <div style={{ width: "220px", minWidth: "220px" }}>
                <CustomFormSelect
                  label="Franchise"
                  controlId="role_franchise_filter"
                  options={franchiseFilterOptions}
                  register={register}
                  fieldName="role_franchise_filter"
                  asCol={false}
                  noBottomMargin
                  defaultValue={franchiseFilter}
                  setValue={setValue}
                  onChange={(e) => {
                    setFranchiseFilter(e.target.value);
                    setRoleCurrentPage(1);
                  }}
                />
              </div>
            </>
          }
          onSearch={(value) => {
            setKeyword(value);
            setRoleCurrentPage(1);
          }}
          hideUtilityActions
          hideMoreIcon={true}
        />
      )}

      {!initialLoadDone ? (
        <div className="text-center py-4">Loading data...</div>
      ) : isStaffSection ? (
        <div className="staff-settings-table-shell">
          <CustomTable
            columns={staffColumns}
            data={staffFiltered}
            currentPage={staffCurrentPage}
            totalPages={staffTotalPages}
            pageSize={SETTINGS_ROLE_PAGE_SIZE}
            onPageChange={(page) => setStaffCurrentPage(page)}
            manualSortBy
            sortBy={staffSortBy}
            onSortChange={(next) => {
              setStaffSortBy(next);
              setStaffCurrentPage(1);
            }}
            isPagination={true}
          />
        </div>
      ) : (
        <CustomTable
          columns={columns}
          data={filtered}
          currentPage={roleCurrentPage}
          totalPages={roleTotalPages}
          pageSize={SETTINGS_ROLE_PAGE_SIZE}
          onPageChange={(page) => setRoleCurrentPage(page)}
          manualSortBy
          sortBy={roleSortBy}
          onSortChange={(next) => {
            setRoleSortBy(next);
            setRoleCurrentPage(1);
          }}
          isPagination={true}
        />
      )}

      <Modal show={showForm} onHide={() => setShowForm(false)} centered>
        <Modal.Header className="py-3 px-4 border-bottom-0">
          <Modal.Title as="h5" className="custom-modal-title">
            {editing
              ? isViewMode
                ? form.roleType === "franchise_admin"
                  ? "Franchise Admin Information"
                  : "Franchise Employee Information"
                : form.roleType === "franchise_admin"
                ? "Edit Franchise Admin"
                : "Edit Franchise Employee"
              : form.roleType === "franchise_admin"
              ? "Add Franchise Admin"
              : "Add Franchise Employee"}
          </Modal.Title>
          <CustomCloseButton onClose={() => setShowForm(false)} />
        </Modal.Header>
        <Modal.Body
          className="px-4 pb-4 pt-0"
          style={{ maxHeight: "70vh", overflowY: "auto" }}
        >
          {isViewMode && editing ? (
            <section
              className="custom-other-details"
              style={{ padding: "10px" }}
            >
              <div className="d-flex justify-content-end mb-2">
                <i
                  className="bi bi-pencil-fill fs-6 text-danger"
                  style={{ cursor: "pointer" }}
                  title="Edit"
                  aria-label="Edit"
                  onClick={() => setIsViewMode(false)}
                />
              </div>
              <div className="text-center mb-3">
                <img
                  src={franchiseRoleProfileImageSrc(editing.profile_url)}
                  alt=""
                  width={120}
                  height={120}
                  style={{
                    objectFit: "cover",
                    borderRadius: "50%",
                    border: "1px solid var(--lb1-border)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  }}
                />
                <h4
                  className="mt-3 mb-0 fw-semibold"
                  style={{
                    color: "var(--navi-color)",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  {editing.roleName}
                </h4>
              </div>
              <div
                className="row pt-3 border-top"
                style={{ borderColor: "var(--lb1-border)" }}
              >
                <div className="col-md-12 custom-helper-column">
                  <DetailsRow title="Email" value={editing.email || "-"} />
                  <DetailsRow
                    title="Phone"
                    value={editing.phone_number || "-"}
                  />

                  <DetailsRow
                    title="Assigned Franchise"
                    value={editing.assignedFranchise || "-"}
                  />
                  <DetailsRow
                    title="Status"
                    value={editing.status === "active" ? "Active" : "Inactive"}
                  />
                  {editing.roleType !== "franchise_admin" ? (
                    <FullDetailsRow
                      title="Screen Permissions"
                      value={
                        editing.screenPermissions?.length ? (
                          <ul className="mb-0 ps-3">
                            {editing.screenPermissions.map((permissionKey) => (
                              <li key={permissionKey}>
                                {labelForFranchiseEmployeeScreenKey(
                                  permissionKey
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          "-"
                        )
                      }
                    />
                  ) : null}
                </div>
              </div>
            </section>
          ) : (
            <div className="row g-2">
              <div className="col-md-12">
                <CustomFormInput
                  label="Name"
                  controlId="role_name"
                  placeholder="Enter Name"
                  register={register}
                  asCol={false}
                  value={form.roleName}
                  onChange={(value: string) =>
                    setForm((p) => ({ ...p, roleName: value }))
                  }
                />
              </div>
              <div className="col-md-12">
                <CustomFormInput
                  label="Email"
                  controlId="role_email"
                  placeholder="name@example.com"
                  register={register}
                  inputType="email"
                  asCol={false}
                  value={form.email}
                  onChange={(value: string) =>
                    setForm((p) => ({ ...p, email: value }))
                  }
                />
              </div>
              <div className="col-md-12">
                <CustomFormInput
                  label="Phone number"
                  controlId="role_phone"
                  placeholder="10-digit mobile number"
                  register={register}
                  inputType="tel"
                  asCol={false}
                  maxLength={10}
                  value={form.phone_number}
                  onChange={(value: string) =>
                    setForm((p) => ({
                      ...p,
                      phone_number: value.replace(/\D/g, "").slice(0, 10),
                    }))
                  }
                />
              </div>
              <div className="col-md-12">
                <CustomImageUploader
                  label="Profile photo"
                  maxFiles={1}
                  isEditable={Boolean(editing)}
                  {...(form.profile_url
                    ? { existingImages: [form.profile_url] }
                    : {})}
                  onFileChange={(files) => {
                    setRoleImageFile(files[0] ?? null);
                    setForm((p) => ({
                      ...p,
                      profile_url: files[0]
                        ? `uploads/${files[0].name}`
                        : p.profile_url,
                    }));
                  }}
                />
              </div>
              <div className="col-md-12">
                <CustomFormSelect
                  label="Assigned Franchise"
                  controlId="assigned_franchise"
                  options={assignedFranchiseOptions}
                  register={register}
                  fieldName="assigned_franchise"
                  asCol={false}
                  defaultValue={form.assignedFranchise}
                  setValue={setValue}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      assignedFranchise: e.target.value,
                    }))
                  }
                  menuPortal
                />
              </div>
              <div className="col-md-12">
                <Form.Group style={{ marginTop: "10px" }}>
                  <Form.Label className="fw-medium mb-1">Status</Form.Label>
                  <div
                    className="d-flex"
                    style={{ flexDirection: "row", gap: "8px" }}
                  >
                    <Form.Check
                      type="radio"
                      id="role_status_active"
                      label={<span className="custom-radio-text">Active</span>}
                      value="active"
                      checked={form.status === "active"}
                      onChange={() =>
                        setForm((p) => ({ ...p, status: "active" }))
                      }
                      className="custom-radio-check"
                    />
                    <Form.Check
                      type="radio"
                      id="role_status_inactive"
                      label={
                        <span className="custom-radio-text">Inactive</span>
                      }
                      value="inactive"
                      checked={form.status === "inactive"}
                      onChange={() =>
                        setForm((p) => ({ ...p, status: "inactive" }))
                      }
                      className="custom-radio-check"
                    />
                  </div>
                </Form.Group>
              </div>
              {form.roleType === "employee" && (
                <div className="col-md-12">
                  <div className="staff-permission-section">
                    <div className="staff-permission-section__head fw-medium mb-1">
                      Screen Permissions
                    </div>
                    <div className="staff-permission-section__body">
                      <div
                        className="d-grid"
                        style={{
                          gap: "10px 20px",
                          gridTemplateColumns: "repeat(2, 1fr)",
                        }}
                      >
                        {employeeScreenPermissionMenuItems.map(
                          ({ key, label }) => (
                            <Form.Check
                              key={key}
                              type="checkbox"
                              id={`role_screen_perm_${key}`}
                              className="custom-checkbox-check"
                              label={
                                <span className="custom-radio-text">
                                  {label}
                                </span>
                              }
                              checked={form.screenPermissions.includes(key)}
                              onChange={() => toggleScreenPermission(key)}
                            />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        {!isViewMode && (
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button
              className="btn-danger"
              disabled={roleSavePending}
              onClick={async () => {
                if (!form.roleName.trim()) {
                  showErrorAlert("Please enter name.");
                  return;
                }
                if (!form.email.trim() || !isValidEmail(form.email)) {
                  showErrorAlert("Please enter a valid email address.");
                  return;
                }
                if (!isValidPhone10(form.phone_number)) {
                  showErrorAlert("Please enter a valid 10-digit phone number.");
                  return;
                }
                const rolePayload = {
                  roleId:
                    editing?.roleId ||
                    `ROLE-${String(items.length + 1).padStart(3, "0")}`,
                  roleName: form.roleName.trim(),
                  email: form.email.trim(),
                  phone_number: form.phone_number.trim(),
                  profile_url: form.profile_url.trim() || undefined,
                  roleType: form.roleType,
                  assignedFranchise: form.assignedFranchise || undefined,
                  franchise_id:
                    (form.assignedFranchise &&
                      franchiseMetaByName.get(form.assignedFranchise)?.value) ||
                    editing?.franchise_id ||
                    undefined,
                  state_id:
                    (form.assignedFranchise &&
                      franchiseMetaByName.get(form.assignedFranchise)
                        ?.state_id) ||
                    editing?.state_id ||
                    undefined,
                  city_id:
                    (form.assignedFranchise &&
                      franchiseMetaByName.get(form.assignedFranchise)
                        ?.city_id) ||
                    editing?.city_id ||
                    undefined,
                  status: form.status,
                  screenPermissions:
                    form.roleType === "employee"
                      ? form.screenPermissions.filter(
                          (k) => !isFranchiseEmployeeExcludedScreenKey(k)
                        )
                      : form.screenPermissions,
                };
                if (editing?.id) {
                  setRoleSavePending(true);
                  try {
                    const ok = await updateRoleUserWithApi(
                      editing.id,
                      rolePayload,
                      roleImageFile ?? undefined
                    );
                    if (ok) {
                      setRoleImageFile(null);
                      setShowForm(false);
                      setReloadToken((v) => v + 1);
                    }
                  } finally {
                    setRoleSavePending(false);
                  }
                  return;
                }
                setRoleSavePending(true);
                try {
                  const ok = await createRoleUserWithApi(
                    rolePayload,
                    roleImageFile ?? undefined
                  );
                  if (ok) {
                    setRoleImageFile(null);
                    setShowForm(false);
                    setRoleCurrentPage(1);
                    setReloadToken((v) => v + 1);
                  }
                } finally {
                  setRoleSavePending(false);
                }
              }}
            >
              {roleSavePending ? "Saving…" : editing ? "Update" : "Save"}
            </Button>
          </Modal.Footer>
        )}
      </Modal>

      <Modal
        show={showStaffModal}
        onHide={() => setShowStaffModal(false)}
        centered
        enforceFocus={false}
        className="staff-settings-modal"
        contentClassName="staff-settings-modal__body"
      >
        <Modal.Header className="staff-settings-modal__header py-3 px-4 border-bottom-0 position-relative">
          <Modal.Title as="h5" className="custom-modal-title pe-4">
            {staffEditing
              ? staffIsViewMode
                ? "Staff Information"
                : "Edit Staff"
              : "Add Staff"}
          </Modal.Title>
          <CustomCloseButton onClose={() => setShowStaffModal(false)} />
        </Modal.Header>
        <Modal.Body
          className="px-4 pb-4 pt-3"
          style={{ maxHeight: "70vh", overflowY: "auto" }}
        >
          {staffIsViewMode && staffEditing ? (
            <section
              className="custom-other-details staff-settings-view-card"
              style={{ padding: "14px" }}
            >
              <div className="d-flex justify-content-end mb-2">
                <i
                  className="bi bi-pencil-fill fs-6"
                  style={{ cursor: "pointer", color: "#0f766e" }}
                  title="Edit"
                  aria-label="Edit"
                  onClick={() => setStaffIsViewMode(false)}
                />
              </div>
              <div className="text-center mb-3">
                <img
                  src={franchiseRoleProfileImageSrc(staffEditing.profile_url)}
                  alt=""
                  width={120}
                  height={120}
                  style={{
                    objectFit: "cover",
                    borderRadius: "50%",
                    border: "1px solid var(--lb1-border)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  }}
                />
                <h4
                  className="mt-3 mb-0 fw-semibold"
                  style={{
                    color: "var(--navi-color)",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  {staffEditing.name}
                </h4>
              </div>
              <div
                className="row pt-3 border-top"
                style={{ borderColor: "var(--lb1-border)" }}
              >
                <div className="col-md-12 custom-helper-column">
                  <FullDetailsRow title="Email" value={staffEditing.email} />
                  <FullDetailsRow
                    title="Phone"
                    value={staffEditing.phone_number}
                  />
                  <FullDetailsRow
                    title="Screen Permissions"
                    value={
                      staffEditing.screenPermissions?.length ? (
                        <ul className="mb-0 ps-3">
                          {staffEditing.screenPermissions.map(
                            (permissionKey) => (
                              <li key={permissionKey}>
                                {labelForFranchiseEmployeeScreenKey(
                                  permissionKey
                                )}
                              </li>
                            )
                          )}
                        </ul>
                      ) : (
                        "-"
                      )
                    }
                  />
                  <FullDetailsRow
                    title="Franchise Permissions"
                    value={staffFranchiseSummary(staffEditing)}
                  />
                </div>
              </div>
            </section>
          ) : (
            <div className="row g-2">
              <div className="col-md-12">
                <CustomFormInput
                  label="Name"
                  controlId="staff_name"
                  placeholder="Enter Name"
                  register={register}
                  asCol={false}
                  value={staffForm.name}
                  onChange={(value: string) =>
                    setStaffForm((p) => ({ ...p, name: value }))
                  }
                />
              </div>
              <div className="col-md-12">
                <CustomFormInput
                  label="Email"
                  controlId="staff_email"
                  placeholder="name@example.com"
                  register={register}
                  inputType="email"
                  asCol={false}
                  value={staffForm.email}
                  onChange={(value: string) =>
                    setStaffForm((p) => ({ ...p, email: value }))
                  }
                />
              </div>
              <div className="col-md-12">
                <CustomFormInput
                  label="Phone number"
                  controlId="staff_phone"
                  placeholder="10-digit mobile number"
                  register={register}
                  inputType="tel"
                  asCol={false}
                  maxLength={10}
                  value={staffForm.phone_number}
                  onChange={(value: string) =>
                    setStaffForm((p) => ({
                      ...p,
                      phone_number: value.replace(/\D/g, "").slice(0, 10),
                    }))
                  }
                />
              </div>
              <div className="col-md-12">
                <CustomImageUploader
                  label="Profile photo"
                  maxFiles={1}
                  isEditable={Boolean(staffEditing)}
                  {...(staffForm.profile_url
                    ? { existingImages: [staffForm.profile_url] }
                    : {})}
                  onFileChange={(files) => {
                    setStaffImageFile(files[0] ?? null);
                    setStaffForm((p) => ({
                      ...p,
                      profile_url: files[0]
                        ? `uploads/${files[0].name}`
                        : p.profile_url,
                    }));
                  }}
                />
              </div>
              <div className="col-md-12">
                <Form.Group style={{ marginTop: "6px" }}>
                  <Form.Label className="fw-medium mb-1">Status</Form.Label>
                  <div
                    className="d-flex"
                    style={{ flexDirection: "row", gap: "8px" }}
                  >
                    <Form.Check
                      type="radio"
                      id="staff_status_active"
                      label={<span className="custom-radio-text">Active</span>}
                      value="active"
                      checked={staffForm.status === "active"}
                      onChange={() =>
                        setStaffForm((p) => ({ ...p, status: "active" }))
                      }
                      className="custom-radio-check"
                    />
                    <Form.Check
                      type="radio"
                      id="staff_status_inactive"
                      label={
                        <span className="custom-radio-text">Inactive</span>
                      }
                      value="inactive"
                      checked={staffForm.status === "inactive"}
                      onChange={() =>
                        setStaffForm((p) => ({ ...p, status: "inactive" }))
                      }
                      className="custom-radio-check"
                    />
                  </div>
                </Form.Group>
              </div>
              <div className="col-md-12">
                <div className="staff-permission-section">
                  <div className="staff-permission-section__head">
                    Screen Permissions
                  </div>
                  <div className="staff-permission-section__body">
                    <div
                      className="d-grid"
                      style={{
                        gap: "10px 20px",
                        gridTemplateColumns: "repeat(2, 1fr)",
                      }}
                    >
                      {staffScreenPermissionMenuItems.map(({ key, label }) => (
                        <Form.Check
                          key={key}
                          type="checkbox"
                          id={`staff_screen_perm_${key}`}
                          className="custom-checkbox-check"
                          label={
                            <span className="custom-radio-text">{label}</span>
                          }
                          checked={staffForm.screenPermissions.includes(key)}
                          onChange={() => toggleStaffScreenPermission(key)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        {!staffIsViewMode && (
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowStaffModal(false)}
            >
              Cancel
            </Button>
            <Button
              className="staff-settings-save-btn"
              disabled={staffSavePending}
              onClick={async () => {
                if (!staffForm.name.trim()) {
                  showErrorAlert("Please enter name.");
                  return;
                }
                if (!staffForm.email.trim() || !isValidEmail(staffForm.email)) {
                  showErrorAlert("Please enter a valid email address.");
                  return;
                }
                if (!isValidPhone10(staffForm.phone_number)) {
                  showErrorAlert("Please enter a valid 10-digit phone number.");
                  return;
                }
                if (
                  !staffForm.allFranchises &&
                  staffForm.franchisePermissions.length === 0
                ) {
                  showErrorAlert(
                    "Select at least one franchise, or choose All franchises."
                  );
                  return;
                }
                const staffPayload = {
                  staffId:
                    staffEditing?.staffId ||
                    `STAFF-${String(staffItems.length + 1).padStart(3, "0")}`,
                  name: staffForm.name.trim(),
                  email: staffForm.email.trim(),
                  phone_number: staffForm.phone_number.trim(),
                  profile_url: staffForm.profile_url.trim() || undefined,
                  status: staffForm.status,
                  screenPermissions: staffForm.screenPermissions.filter(
                    (k) => k !== "my-franchise"
                  ),
                  allFranchises: staffForm.allFranchises,
                  franchisePermissions: staffForm.allFranchises
                    ? []
                    : [...staffForm.franchisePermissions],
                };
                if (staffEditing?.id) {
                  setStaffSavePending(true);
                  try {
                    const ok = await updateStaffUserWithApi(
                      staffEditing.id,
                      staffPayload,
                      staffImageFile ?? undefined
                    );
                    if (ok) {
                      setStaffImageFile(null);
                      setShowStaffModal(false);
                      setReloadToken((v) => v + 1);
                    }
                  } finally {
                    setStaffSavePending(false);
                  }
                  return;
                }
                setStaffSavePending(true);
                try {
                  const ok = await createStaffUserWithApi(
                    staffPayload,
                    staffImageFile ?? undefined
                  );
                  if (ok) {
                    setStaffImageFile(null);
                    setShowStaffModal(false);
                    setStaffCurrentPage(1);
                    setReloadToken((v) => v + 1);
                  }
                } finally {
                  setStaffSavePending(false);
                }
              }}
            >
              {staffSavePending ? "Saving…" : staffEditing ? "Update" : "Save"}
            </Button>
          </Modal.Footer>
        )}
      </Modal>
    </div>
  );
};

export default RoleManagement;
