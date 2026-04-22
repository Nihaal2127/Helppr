import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";
import { useForm } from "react-hook-form";
import Select, { MultiValue } from "react-select";
import CustomHeader from "../../../components/CustomHeader";
import SettingsNav from "../../../components/SettingsNav";
import CustomTable from "../../../components/CustomTable";
import CustomUtilityBox from "../../../components/CustomUtilityBox";
import CustomActionColumn from "../../../components/CustomActionColumn";
import CustomSummaryBox from "../../../components/CustomSummaryBox";
import { CustomFormInput } from "../../../components/CustomFormInput";
import CustomFormSelect from "../../../components/CustomFormSelect";
import { DetailsRow, FullDetailsRow } from "../../../helper/utility";
import { RoleSettingsModel, StaffSettingsModel } from "../../../models/SettingsModel";
import {
  ensureSettingsSeedData,
  createRoleUserWithApi,
  createStaffUserWithApi,
  getRoles,
  getStaff,
  saveRole,
  saveStaff,
  voidRole,
} from "../../../services/settingsService";
import CustomCloseButton from "../../../components/CustomCloseButton";
import CustomTextFieldUpload from "../../../components/CustomTextFieldUpload";
import { openConfirmDialog } from "../../../components/CustomConfirmDialog";
import { showErrorAlert } from "../../../helper/alertHelper";
import { mainMenuItems } from "../../../layout/menuItems";
import { franchiseMockSeed } from "../../../mockData/franchiseMockData";
import { AppConstant } from "../../../constant/AppConstant";
import profilePlaceholder from "../../../assets/icons/profile.svg";

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

const screenPermissionLabel = (key: string) =>
  mainMenuItems.find((item) => item.key === key)?.label ?? key;

const franchiseCatalogNames = franchiseMockSeed.map((f) => f.name);

const STAFF_FRANCHISE_ALL = "__all__";

type StaffFranchiseOption = { value: string; label: string };

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
  if (u.startsWith("http://") || u.startsWith("https://") || u.startsWith("data:")) return u;
  if (u.startsWith("uploads/")) return profilePlaceholder;
  return `${AppConstant.IMAGE_BASE_URL}${u}?t=${Date.now()}`;
}

const staffFranchiseSummary = (s: StaffSettingsModel) =>
  s.allFranchises
    ? "All franchises"
    : s.franchisePermissions.length
      ? s.franchisePermissions.join(", ")
      : "-";

const RoleManagement = () => {
  const { register, setValue } = useForm<any>();
  const [items, setItems] = useState<RoleSettingsModel[]>([]);
  const [keyword, setKeyword] = useState("");
  const [roleType, setRoleType] = useState<"all" | "franchise_admin" | "employee">("franchise_admin");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [franchiseFilter, setFranchiseFilter] = useState("all");
  const [utilitySearchKey, setUtilitySearchKey] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RoleSettingsModel | null>(null);
  const [form, setForm] = useState(emptyRoleForm);
  const [isViewMode, setIsViewMode] = useState(false);
  const [selectedBox, setSelectedBox] = useState("box-franchise-admin");

  const [staffItems, setStaffItems] = useState<StaffSettingsModel[]>([]);
  const [staffKeyword, setStaffKeyword] = useState("");
  const [staffStatus, setStaffStatus] = useState<"all" | "active" | "inactive">("all");
  const [staffUtilityKey, setStaffUtilityKey] = useState(0);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffEditing, setStaffEditing] = useState<StaffSettingsModel | null>(null);
  const [staffForm, setStaffForm] = useState(emptyStaffForm);
  const [staffIsViewMode, setStaffIsViewMode] = useState(false);
  const [roleSavePending, setRoleSavePending] = useState(false);
  const [staffSavePending, setStaffSavePending] = useState(false);

  const openFormWithData = useCallback((item?: RoleSettingsModel, viewMode = false) => {
    if (!item) {
      setEditing(null);
      setForm(emptyRoleForm);
      setIsViewMode(false);
      setShowForm(true);
      return;
    }
    setEditing(item);
    setIsViewMode(viewMode);
    setForm({
      roleName: item.roleName,
      email: item.email ?? "",
      phone_number: item.phone_number ?? "",
      profile_url: item.profile_url ?? "",
      roleType: item.roleType,
      assignedFranchise: item.assignedFranchise || "",
      status: item.status,
      screenPermissions: item.screenPermissions?.length ? [...item.screenPermissions] : [],
    });
    setShowForm(true);
  }, []);

  const openStaffWithData = useCallback((item?: StaffSettingsModel, viewMode = false) => {
    if (!item) {
      setStaffEditing(null);
      setStaffForm({ ...emptyStaffForm });
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
      screenPermissions: item.screenPermissions?.length ? [...item.screenPermissions] : [],
      allFranchises: item.allFranchises,
      franchisePermissions: item.franchisePermissions?.length ? [...item.franchisePermissions] : [],
    });
    setShowStaffModal(true);
  }, []);

  const refresh = useCallback(() => setItems(getRoles()), []);
  const refreshStaff = useCallback(() => setStaffItems(getStaff()), []);

  useEffect(() => {
    ensureSettingsSeedData();
    refresh();
    refreshStaff();
  }, [refresh, refreshStaff]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const k = keyword.trim().toLowerCase();
      const matchesKeyword =
        !k ||
        item.roleName.toLowerCase().includes(k) ||
        (item.email ?? "").toLowerCase().includes(k) ||
        (item.phone_number ?? "").includes(k);
      const matchesType = roleType === "all" || item.roleType === roleType;
      const matchesStatus = status === "all" || item.status === status;
      const matchesFranchise =
        franchiseFilter === "all" || (item.assignedFranchise || "") === franchiseFilter;
      return matchesKeyword && matchesType && matchesStatus && matchesFranchise;
    });
  }, [items, keyword, roleType, status, franchiseFilter]);

  const isStaffSection = selectedBox === "box-staff";

  const staffFiltered = useMemo(() => {
    return staffItems.filter((item) => {
      const k = staffKeyword.trim().toLowerCase();
      const matchesKeyword =
        !k ||
        item.name.toLowerCase().includes(k) ||
        (item.email ?? "").toLowerCase().includes(k) ||
        (item.phone_number ?? "").includes(k);
      const matchesStatus = staffStatus === "all" || item.status === staffStatus;
      return matchesKeyword && matchesStatus;
    });
  }, [staffItems, staffKeyword, staffStatus]);

  const franchiseAdminSummaryData = useMemo(
    () => ({
      Total: items.filter((item) => item.roleType === "franchise_admin").length,
      Active: items.filter((item) => item.roleType === "franchise_admin" && item.status === "active").length,
      Inactive: items.filter((item) => item.roleType === "franchise_admin" && item.status === "inactive").length,
    }),
    [items]
  );

  const employeeSummaryData = useMemo(
    () => ({
      Total: items.filter((item) => item.roleType === "employee").length,
      Active: items.filter((item) => item.roleType === "employee" && item.status === "active").length,
      Inactive: items.filter((item) => item.roleType === "employee" && item.status === "inactive").length,
    }),
    [items]
  );

  const staffSummaryData = useMemo(
    () => ({
      Total: staffItems.length,
      Active: staffItems.filter((item) => item.status === "active").length,
      Inactive: staffItems.filter((item) => item.status === "inactive").length,
    }),
    [staffItems]
  );

  const assignedFranchiseOptions = useMemo(() => {
    const uniqueFranchises = Array.from(
      new Set(
        items
          .map((item) => item.assignedFranchise?.trim())
          .filter((value): value is string => Boolean(value))
      )
    );

    const options = uniqueFranchises.map((franchise) => ({
      value: franchise,
      label: franchise,
    }));

    if (form.assignedFranchise && !uniqueFranchises.includes(form.assignedFranchise)) {
      options.unshift({
        value: form.assignedFranchise,
        label: form.assignedFranchise,
      });
    }

    return [{ value: "", label: "Select Franchise" }, ...options];
  }, [items, form.assignedFranchise]);

  const franchiseFilterOptions = useMemo(() => {
    const uniqueFranchises = Array.from(
      new Set(
        items
          .map((item) => item.assignedFranchise?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b));

    return [
      { value: "all", label: "All Franchises" },
      ...uniqueFranchises.map((franchise) => ({
        value: franchise,
        label: franchise,
      })),
    ];
  }, [items]);

  const columns = React.useMemo(
    () => [
      { Header: "SR No", accessor: "sr", Cell: ({ row }: any) => row.index + 1 },
      // {
      //   Header: "Id",
      //   accessor: "roleId",
      //   Cell: textUnderlineCell("roleId", (row) => openFormWithData(row, true)),
      // },
      { Header: "Name", accessor: "roleName" },
      {
        Header: "Email",
        accessor: "email",
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
          <span className={row.original.status === "active" ? "custom-active" : "custom-inactive"}>
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
                  refresh();
                }
              );
            }}
          />
        ),
      },
    ],
    [refresh, openFormWithData]
  );

  const staffColumns = React.useMemo(
    () => [
      { Header: "S.no", accessor: "sr", Cell: ({ row }: any) => row.index + 1 },
      // {
      //   Header: "ID",
      //   accessor: "staffId",
      //   Cell: textUnderlineCell("staffId", (row) => openStaffWithData(row, true)),
      // },
      { Header: "Name", accessor: "name" },
      {
        Header: "Email",
        accessor: "email",
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
          <span className={row.original.status === "active" ? "custom-active" : "custom-inactive"}>
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
    setUtilitySearchKey((k) => k + 1);
  };

  const clearStaffFiltersDisabled = !staffKeyword.trim() && staffStatus === "all";

  const clearStaffFilters = () => {
    setStaffKeyword("");
    setStaffStatus("all");
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

  const staffFranchiseMultiOptions = useMemo<StaffFranchiseOption[]>(
    () => [
      { value: STAFF_FRANCHISE_ALL, label: "All franchises" },
      ...franchiseCatalogNames.map((name) => ({ value: name, label: name })),
    ],
    []
  );

  const staffFranchiseSelectValue = useMemo<StaffFranchiseOption[]>(() => {
    if (staffForm.allFranchises) {
      return [{ value: STAFF_FRANCHISE_ALL, label: "All franchises" }];
    }
    return staffForm.franchisePermissions.map((name) => ({ value: name, label: name }));
  }, [staffForm.allFranchises, staffForm.franchisePermissions]);

  const handleStaffFranchiseMultiChange = (newValue: MultiValue<StaffFranchiseOption>) => {
    setStaffForm((prev) => {
      const vals = (newValue ?? []).map((o) => o.value);
      if (vals.length === 0) {
        return { ...prev, allFranchises: false, franchisePermissions: [] };
      }
      if (vals.includes(STAFF_FRANCHISE_ALL) && vals.length > 1) {
        if (prev.allFranchises) {
          const only = vals.filter((v) => v !== STAFF_FRANCHISE_ALL);
          return { ...prev, allFranchises: false, franchisePermissions: only };
        }
        return { ...prev, allFranchises: true, franchisePermissions: [] };
      }
      if (vals.includes(STAFF_FRANCHISE_ALL)) {
        return { ...prev, allFranchises: true, franchisePermissions: [] };
      }
      return { ...prev, allFranchises: false, franchisePermissions: vals };
    });
  };

  const staffFranchiseMultiStyles = useMemo(
    () => ({
      control: (provided: Record<string, unknown>) => ({
        ...provided,
        borderColor: "var(--primary-color)",
        boxShadow: "none",
        borderRadius: "8px",
        minHeight: "42px",
        backgroundColor: "var(--bg-color)",
        fontFamily: "'Inter', sans-serif",
        fontSize: "14px",
      }),
      multiValue: (provided: Record<string, unknown>) => ({
        ...provided,
        backgroundColor: "rgba(15, 118, 110, 0.14)",
        borderRadius: "6px",
      }),
      multiValueLabel: (provided: Record<string, unknown>) => ({
        ...provided,
        color: "var(--content-txt-color)",
        fontSize: "13px",
      }),
      multiValueRemove: (provided: Record<string, unknown>) => ({
        ...provided,
        color: "#0f766e",
        ":hover": {
          backgroundColor: "rgba(15, 118, 110, 0.35)",
          color: "#fff",
        },
      }),
      option: (provided: Record<string, unknown>, state: { isSelected: boolean; isFocused: boolean }) => ({
        ...provided,
        backgroundColor: state.isSelected
          ? "var(--txtfld-border)"
          : state.isFocused
            ? "var(--primary-color)"
            : "",
        color: state.isSelected
          ? "var(--bg-color)"
          : state.isFocused
            ? "var(--bg-color)"
            : "var(--primary-color)",
      }),
      placeholder: (provided: Record<string, unknown>) => ({
        ...provided,
        color: "var(--placeholder-txt)",
        fontSize: "14px",
      }),
      menuPortal: (provided: Record<string, unknown>) => ({ ...provided, zIndex: 9999 }),
    }),
    []
  );

  return (
    <div className="main-page-content">
      <CustomHeader
        title="Management Roles"
        titlePrefix={<SettingsNav />}
        register={register}
        setValue={setValue}
      />

      <div className="box-container settings-role-box-container">
        <CustomSummaryBox
          divId="box-franchise-admin"
          title="Franchise Admin"
          data={franchiseAdminSummaryData}
          onSelect={(divId) => {
            setSelectedBox(divId);
            setRoleType("franchise_admin");
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
            setShowForm(true);
          }}
        />

        <CustomSummaryBox
          divId="box-employee"
          title="Franchise Employee"
          data={employeeSummaryData}
          onSelect={(divId) => {
            setSelectedBox(divId);
            setRoleType("employee");
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
            setShowForm(true);
          }}
        />

        <CustomSummaryBox
          className="box-staff-card"
          divId="box-staff"
          title="Staff"
          data={staffSummaryData}
          onSelect={(divId) => setSelectedBox(divId)}
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
            setShowStaffModal(true);
          }}
        />
      </div>

      {isStaffSection ? (
        <div className="staff-settings-utility">
          <CustomUtilityBox
            key={`staff-utility-${staffUtilityKey}`}
            title="Staff"
            searchHint="Search Name"
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
                  onChange={(e) => setStaffStatus(e.target.value as "all" | "active" | "inactive")}
                />
              </div>
            }
            onSearch={(value) => setStaffKeyword(value)}
            onSortClick={() => {}}
            onDownloadClick={() => {}}
            onMoreClick={() => {}}
            hideMoreIcon={true}
          />
        </div>
      ) : (
        <CustomUtilityBox
          key={`role-utility-${utilitySearchKey}`}
          title={`${selectedBox === "box-franchise-admin" ? "Franchise Admin" : "Franchise Employee"}`}
          searchHint="Search Name"
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
                  onChange={(e) => setStatus(e.target.value as "all" | "active" | "inactive")}
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
                  onChange={(e) => setFranchiseFilter(e.target.value)}
                />
              </div>
            </>
          }
          onSearch={(value) => setKeyword(value)}
          onSortClick={() => {}}
          onDownloadClick={() => {}}
          onMoreClick={() => {}}
          hideMoreIcon={true}
        />
      )}

      {isStaffSection ? (
        <div className="staff-settings-table-shell">
          <CustomTable
            columns={staffColumns}
            data={staffFiltered}
            currentPage={1}
            totalPages={1}
            pageSize={staffFiltered.length || 10}
            onPageChange={() => {}}
            isPagination={false}
          />
        </div>
      ) : (
        <CustomTable columns={columns} data={filtered} currentPage={1} totalPages={1} pageSize={filtered.length || 10} onPageChange={() => {}} isPagination={false} />
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
          <Modal.Body className="px-4 pb-4 pt-0" style={{ maxHeight: "70vh", overflowY: "auto" }}>
            {isViewMode && editing ? (
              <section className="custom-other-details" style={{ padding: "10px" }}>
                <div className="d-flex justify-content-end mb-2">
                  <i
                    className="bi bi-pencil-fill fs-6 text-danger"
                    style={{ cursor: "pointer" }}
                    title="Edit"
                    aria-label="Edit"
                    onClick={() => setIsViewMode(false)}
                  />
                </div>
                <div className="text-center mb-4 pb-2">
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
                    style={{ color: "var(--navi-color)", fontFamily: "Inter, sans-serif" }}
                  >
                    {editing.roleName}
                  </h4>
                 
                </div>
                <div className="row pt-3 border-top" style={{ borderColor: "var(--lb1-border)" }}>
                  <div className="col-md-12 custom-helper-column">
                  <DetailsRow title="Email" value={editing.email || "-"} />
                    <DetailsRow title="Phone" value={editing.phone_number || "-"} />
                    
                    <DetailsRow title="Assigned Franchise" value={editing.assignedFranchise || "-"} />
                    <DetailsRow title="Status" value={editing.status === "active" ? "Active" : "Inactive"} />
                    <FullDetailsRow
                      title="Screen Permissions"
                      value={
                        editing.screenPermissions?.length
                          ? editing.screenPermissions.map(screenPermissionLabel).join(", ")
                          : "-"
                      }
                    />
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
                    onChange={(value: string) => setForm((p) => ({ ...p, roleName: value }))}
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
                    onChange={(value: string) => setForm((p) => ({ ...p, email: value }))}
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
                  <CustomTextFieldUpload
                    label="Profile photo"
                    linkLable="Upload"
                    {...(form.profile_url ? { existingImages: [form.profile_url] } : {})}
                    onFileChange={(files) => {
                      setForm((p) => ({
                        ...p,
                        profile_url: files[0] ? `uploads/${files[0].name}` : p.profile_url,
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
                onChange={(e) => setForm((p) => ({ ...p, assignedFranchise: e.target.value }))}
                menuPortal
              />
            </div>
            <div className="col-md-12">
              <Form.Group style={{ marginTop: "10px" }}>
                <Form.Label className="fw-medium mb-1">Status</Form.Label>
                <div className="d-flex" style={{ flexDirection: "row", gap: "8px" }}>
                  <Form.Check
                    type="radio"
                    id="role_status_active"
                    label={<span className="custom-radio-text">Active</span>}
                    value="active"
                    checked={form.status === "active"}
                    onChange={() => setForm((p) => ({ ...p, status: "active" }))}
                    className="custom-radio-check"
                  />
                  <Form.Check
                    type="radio"
                    id="role_status_inactive"
                    label={<span className="custom-radio-text">Inactive</span>}
                    value="inactive"
                    checked={form.status === "inactive"}
                    onChange={() => setForm((p) => ({ ...p, status: "inactive" }))}
                    className="custom-radio-check"
                  />
                </div>
              </Form.Group>
            </div>
           
              </div>
            )}
          </Modal.Body>
          {!isViewMode && (
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
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
                    roleId: editing?.roleId || `ROLE-${String(items.length + 1).padStart(3, "0")}`,
                    roleName: form.roleName.trim(),
                    email: form.email.trim(),
                    phone_number: form.phone_number.trim(),
                    profile_url: form.profile_url.trim() || undefined,
                    roleType: form.roleType,
                    assignedFranchise: form.assignedFranchise || undefined,
                    status: form.status,
                    screenPermissions: form.screenPermissions,
                  };
                  if (editing?.id) {
                    saveRole(rolePayload, editing.id);
                    setShowForm(false);
                    refresh();
                    return;
                  }
                  setRoleSavePending(true);
                  try {
                    const ok = await createRoleUserWithApi(rolePayload);
                    if (ok) {
                      setShowForm(false);
                      refresh();
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
        <Modal.Body className="px-4 pb-4 pt-3" style={{ maxHeight: "70vh", overflowY: "auto" }}>
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
              <div className="text-center mb-4 pb-2">
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
                  style={{ color: "var(--navi-color)", fontFamily: "Inter, sans-serif" }}
                >
                  {staffEditing.name}
                </h4>
               
              </div>
              <div className="row pt-3 border-top" style={{ borderColor: "var(--lb1-border)" }}>
                <div className="col-md-12 custom-helper-column">
                <FullDetailsRow title="Email" value={staffEditing.email}/>
                <FullDetailsRow title="Phone" value={staffEditing.phone_number}/>
                  <FullDetailsRow
                    title="Screen Permissions"
                    value={
                      staffEditing.screenPermissions?.length
                        ? staffEditing.screenPermissions.map(screenPermissionLabel).join(", ")
                        : "-"
                    }
                  />
                  <FullDetailsRow title="Franchise Permissions" value={staffFranchiseSummary(staffEditing)} />
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
                  onChange={(value: string) => setStaffForm((p) => ({ ...p, name: value }))}
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
                  onChange={(value: string) => setStaffForm((p) => ({ ...p, email: value }))}
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
                <CustomTextFieldUpload
                  label="Profile photo"
                  linkLable="Upload"
                  {...(staffForm.profile_url ? { existingImages: [staffForm.profile_url] } : {})}
                  onFileChange={(files) => {
                    setStaffForm((p) => ({
                      ...p,
                      profile_url: files[0] ? `uploads/${files[0].name}` : p.profile_url,
                    }));
                  }}
                />
              </div>
              <div className="col-md-12">

                <Form.Group style={{ marginTop: "6px" }}>
                  <Form.Label className="fw-medium mb-1">Status</Form.Label>
                  <div className="d-flex" style={{ flexDirection: "row", gap: "8px" }}>
                    <Form.Check
                      type="radio"
                      id="staff_status_active"
                      label={<span className="custom-radio-text">Active</span>}
                      value="active"
                      checked={staffForm.status === "active"}
                      onChange={() => setStaffForm((p) => ({ ...p, status: "active" }))}
                      className="custom-radio-check"
                    />
                    <Form.Check
                      type="radio"
                      id="staff_status_inactive"
                      label={<span className="custom-radio-text">Inactive</span>}
                      value="inactive"
                      checked={staffForm.status === "inactive"}
                      onChange={() => setStaffForm((p) => ({ ...p, status: "inactive" }))}
                      className="custom-radio-check"
                    />
                  </div>
                </Form.Group>
              </div>
              <div className="col-md-12">
                <div className="staff-permission-section">
                  <div className="staff-permission-section__head">Screen Permissions</div>
                  <div className="staff-permission-section__body">
                    <div className="d-grid" style={{ gap: "10px 20px", gridTemplateColumns: "repeat(2, 1fr)" }}>
                      {mainMenuItems.map(({ key, label }) => (
                        <Form.Check
                          key={key}
                          type="checkbox"
                          id={`staff_screen_perm_${key}`}
                          className="custom-checkbox-check"
                          label={<span className="custom-radio-text">{label}</span>}
                          checked={staffForm.screenPermissions.includes(key)}
                          onChange={() => toggleStaffScreenPermission(key)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-12">
                <div className="staff-permission-section">
                  <div className="staff-permission-section__head">Franchise Permissions</div>
                  <div className="staff-permission-section__body">
                    <Form.Label className="fw-medium mb-2 d-block" style={{ fontSize: "14px" }}>
                      Select one or more options
                    </Form.Label>
                    <Select<StaffFranchiseOption, true>
                      inputId="staff_franchise_multi"
                      instanceId="staff_franchise_multi"
                      isMulti
                      isClearable
                      closeMenuOnSelect={false}
                      options={staffFranchiseMultiOptions}
                      value={staffFranchiseSelectValue}
                      onChange={handleStaffFranchiseMultiChange}
                      placeholder="All franchises, or choose specific franchises…"
                      styles={staffFranchiseMultiStyles}
                      menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                      menuPosition="fixed"
                      classNamePrefix="staff-franchise-react-select"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        {!staffIsViewMode && (
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowStaffModal(false)}>
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
                if (!staffForm.allFranchises && staffForm.franchisePermissions.length === 0) {
                  showErrorAlert("Select at least one franchise, or choose All franchises.");
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
                  screenPermissions: [...staffForm.screenPermissions],
                  allFranchises: staffForm.allFranchises,
                  franchisePermissions: staffForm.allFranchises ? [] : [...staffForm.franchisePermissions],
                };
                if (staffEditing?.id) {
                  saveStaff(staffPayload, staffEditing.id);
                  setShowStaffModal(false);
                  refreshStaff();
                  return;
                }
                setStaffSavePending(true);
                try {
                  const ok = await createStaffUserWithApi(staffPayload);
                  if (ok) {
                    setShowStaffModal(false);
                    refreshStaff();
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