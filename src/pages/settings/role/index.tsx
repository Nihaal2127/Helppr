import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";
import { useForm } from "react-hook-form";
import CustomHeader from "../../../components/CustomHeader";
import SettingsNav from "../../../components/SettingsNav";
import CustomTable from "../../../components/CustomTable";
import CustomUtilityBox from "../../../components/CustomUtilityBox";
import CustomActionColumn from "../../../components/CustomActionColumn";
import CustomSummaryBox from "../../../components/CustomSummaryBox";
import { CustomFormInput } from "../../../components/CustomFormInput";
import CustomFormSelect from "../../../components/CustomFormSelect";
import { DetailsRow, textUnderlineCell } from "../../../helper/utility";
import { RoleSettingsModel } from "../../../models/SettingsModel";
import { ensureSettingsSeedData, getRoles, saveRole, voidRole } from "../../../services/settingsService";
import CustomCloseButton from "../../../components/CustomCloseButton";
import { openConfirmDialog } from "../../../components/CustomConfirmDialog";

const emptyRoleForm = {
  roleName: "",
  roleType: "franchise_admin" as "franchise_admin" | "employee",
  assignedFranchise: "",
  status: "active" as "active" | "inactive",
};

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

  const openFormWithData = (item?: RoleSettingsModel, viewMode = false) => {
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
      roleType: item.roleType,
      assignedFranchise: item.assignedFranchise || "",
      status: item.status,
    });
    setShowForm(true);
  };

  const refresh = useCallback(() => setItems(getRoles()), []);

  useEffect(() => {
    ensureSettingsSeedData();
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const k = keyword.trim().toLowerCase();
      const matchesKeyword =
        !k ||
        item.roleName.toLowerCase().includes(k);
      const matchesType = roleType === "all" || item.roleType === roleType;
      const matchesStatus = status === "all" || item.status === status;
      const matchesFranchise =
        franchiseFilter === "all" || (item.assignedFranchise || "") === franchiseFilter;
      return matchesKeyword && matchesType && matchesStatus && matchesFranchise;
    });
  }, [items, keyword, roleType, status, franchiseFilter]);

  const franchiseAdminSummaryData = useMemo(
    () => ({
      Total: items.filter((item) => item.roleType === "franchise_admin").length,
      Active: items.filter((item) => item.roleType === "franchise_admin" && item.status === "active").length,
    }),
    [items]
  );

  const employeeSummaryData = useMemo(
    () => ({
      Total: items.filter((item) => item.roleType === "employee").length,
      Active: items.filter((item) => item.roleType === "employee" && item.status === "active").length,
    }),
    [items]
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
      {
        Header: "Id",
        accessor: "roleId",
        Cell: textUnderlineCell("roleId", (row) => openFormWithData(row, true)),
      },
      { Header: "Name", accessor: "roleName" },
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
    [refresh]
  );

  const clearFiltersDisabled =
    !keyword.trim() && status === "all" && franchiseFilter === "all";

  const clearRoleFilters = () => {
    setKeyword("");
    setStatus("all");
    setFranchiseFilter("all");
    setUtilitySearchKey((k) => k + 1);
  };

  return (
    <div className="main-page-content">
      <CustomHeader
        title="Management Roles"
        titlePrefix={<SettingsNav />}
        register={register}
        setValue={setValue}
      />

      <div className="box-container">
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
          title="Employee"
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
      </div>

      <CustomUtilityBox
        key={`role-utility-${utilitySearchKey}`}
        title="Management Roles"
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

      <CustomTable columns={columns} data={filtered} currentPage={1} totalPages={1} pageSize={filtered.length || 10} onPageChange={() => {}} isPagination={false} />

      <Modal show={showForm} onHide={() => setShowForm(false)} centered>
          <Modal.Header className="py-3 px-4 border-bottom-0">
            <Modal.Title as="h5" className="custom-modal-title">
              {editing ? (isViewMode ? "Management Role Information" : "Edit Management Role") : "Add Management Role"}
            </Modal.Title>
            <CustomCloseButton onClose={() => setShowForm(false)} />
          </Modal.Header>
          <Modal.Body className="px-4 pb-4 pt-0" style={{ maxHeight: "70vh", overflowY: "auto" }}>
            {isViewMode && editing ? (
              <section className="custom-other-details" style={{ padding: "10px" }}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h3 className="mb-0">Management Role</h3>
                  <i
                    className="bi bi-pencil-fill fs-6 text-danger"
                    style={{ cursor: "pointer" }}
                    onClick={() => setIsViewMode(false)}
                  />
                </div>
                <div className="row">
                  <div className="col-md-12 custom-helper-column">
                    <DetailsRow title="Id" value={editing.roleId} />
                    <DetailsRow title="Name" value={editing.roleName} />
                  </div>
                  <div className="col-md-12 custom-helper-column">
                    <DetailsRow title="Assigned Franchise" value={editing.assignedFranchise || "-"} />
                    <DetailsRow title="Status" value={editing.status === "active" ? "Active" : "Inactive"} />
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
              <CustomFormSelect
                label="Assigned Franchise (Optional)"
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
                onClick={() => {
                  if (!form.roleName.trim()) return;
                  saveRole(
                    {
                      roleId: editing?.roleId || `ROLE-${String(items.length + 1).padStart(3, "0")}`,
                      roleName: form.roleName,
                      roleType: form.roleType,
                      assignedFranchise: form.assignedFranchise || undefined,
                      status: form.status,
                    },
                    editing?.id
                  );
                  setShowForm(false);
                  refresh();
                }}
              >
                {editing ? "Update" : "Save"}
              </Button>
            </Modal.Footer>
          )}
      </Modal>
    </div>
  );
};

export default RoleManagement;