import React, { useEffect, useMemo, useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";
import { useForm } from "react-hook-form";
import CustomHeader from "../../../components/CustomHeader";
import SettingsNav from "../../../components/SettingsNav";
import CustomTable from "../../../components/CustomTable";
import CustomUtilityBox from "../../../components/CustomUtilityBox";
import CustomActionColumn from "../../../components/CustomActionColumn";
import CustomSummaryBox from "../../../components/CustomSummaryBox";
import { DetailsRow, formatDate, textUnderlineCell } from "../../../helper/utility";
import { RoleSettingsModel } from "../../../models/SettingsModel";
import { ensureSettingsSeedData, getRoles, saveRole, voidRole } from "../../../services/settingsService";
import CustomCloseButton from "../../../components/CustomCloseButton";

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

  const refresh = () => setItems(getRoles());

  useEffect(() => {
    ensureSettingsSeedData();
    refresh();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const k = keyword.trim().toLowerCase();
      const matchesKeyword =
        !k ||
        item.roleName.toLowerCase().includes(k);
      const matchesType = roleType === "all" || item.roleType === roleType;
      const matchesStatus = status === "all" || item.status === status;
      return matchesKeyword && matchesType && matchesStatus;
    });
  }, [items, keyword, roleType, status]);

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
              voidRole(row.original.id);
              refresh();
            }}
          />
        ),
      },
    ],
    [items]
  );

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
        title="Management Roles"
        searchHint="Search Name"
        controlSlot={
          <div style={{ width: "190px" }}>
            <Form.Select value={status} onChange={(e) => setStatus(e.target.value as any)}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Form.Select>
          </div>
        }
        onSearch={(value) => setKeyword(value)}
        onSortClick={() => {}}
        onDownloadClick={() => {}}
        onMoreClick={() => {}}
        hideMoreIcon={true}
      />

      <CustomTable columns={columns} data={filtered} currentPage={1} totalPages={1} pageSize={filtered.length || 10} onPageChange={() => {}} isPagination={false} />

      <Modal show={showForm} onHide={() => setShowForm(false)} centered size="lg">
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
                  <div className="col-md-6 custom-helper-column">
                    <DetailsRow title="Id" value={editing.roleId} />
                    <DetailsRow title="Name" value={editing.roleName} />
                  </div>
                  <div className="col-md-6 custom-helper-column">
                    <DetailsRow title="Assigned Franchise" value={editing.assignedFranchise || "-"} />
                    <DetailsRow title="Status" value={editing.status === "active" ? "Active" : "Inactive"} />
                  </div>
                </div>
              </section>
            ) : (
              <div className="row g-2">
                <div className="col-md-12">
                  <Form.Label>Name</Form.Label>
                  <Form.Control value={form.roleName} onChange={(e) => setForm((p) => ({ ...p, roleName: e.target.value }))} />
                </div>
            <div className="col-md-6">
              <Form.Label>Status</Form.Label>
              <Form.Select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as any }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Form.Select>
            </div>
            <div className="col-md-12">
              <Form.Label>Assigned Franchise (Optional)</Form.Label>
              <Form.Control value={form.assignedFranchise} onChange={(e) => setForm((p) => ({ ...p, assignedFranchise: e.target.value }))} />
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