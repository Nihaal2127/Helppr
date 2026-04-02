import React, { useEffect, useMemo, useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";
import CustomHeader from "../../../components/CustomHeader";
import CustomTable from "../../../components/CustomTable";
import CustomUtilityBox from "../../../components/CustomUtilityBox";
import CustomSummaryBox from "../../../components/CustomSummaryBox";
import { capitalizeString, DetailsRow, formatDate, textUnderlineCell } from "../../../helper/utility";
import { ExpenseCategoryModel } from "../../../models/SettingsModel";
import SettingsNav from "../../../components/SettingsNav";
import {
  ensureSettingsSeedData,
  getExpenseCategories,
  saveExpenseCategory,
} from "../../../services/settingsService";
import CustomCloseButton from "../../../components/CustomCloseButton";

const emptyForm = {
  categoryName: "",
  subCategoryName: "",
  description: "",
};

const ExpenseCategoryManagement = () => {
  const [items, setItems] = useState<ExpenseCategoryModel[]>([]);
  const [keyword, setKeyword] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ExpenseCategoryModel | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isViewMode, setIsViewMode] = useState(false);
  const [selectedBox, setSelectedBox] = useState("box-expense-category");

  const openFormWithData = (item?: ExpenseCategoryModel, viewMode = false) => {
    if (!item) {
      setEditing(null);
      setForm(emptyForm);
      setIsViewMode(false);
      setShowForm(true);
      return;
    }
    setEditing(item);
    setIsViewMode(viewMode);
    setForm({
      categoryName: item.categoryName,
      subCategoryName: item.subCategoryName,
      description: item.description || "",
    });
    setShowForm(true);
  };

  const refresh = () => setItems(getExpenseCategories());

  useEffect(() => {
    ensureSettingsSeedData();
    refresh();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const k = keyword.trim().toLowerCase();
      const matchesKeyword =
        !k ||
        item.categoryName.toLowerCase().includes(k) ||
        item.subCategoryName.toLowerCase().includes(k);
      const date = new Date(item.createdDate).getTime();
      const from = fromDate ? new Date(fromDate).getTime() : null;
      const to = toDate ? new Date(toDate).getTime() : null;
      const matchesDate = (from === null || date >= from) && (to === null || date <= to);
      return matchesKeyword && matchesDate;
    });
  }, [items, keyword, fromDate, toDate]);

  const expenseSummaryData = useMemo(
    () => ({
      Total: items.length,
    }),
    [items]
  );

  const columns = React.useMemo(
    () => [
      { Header: "SR No", accessor: "sr", Cell: ({ row }: any) => row.index + 1 },
      {
        Header: "Category Name",
        accessor: "categoryName",
        Cell: textUnderlineCell("categoryName", (row) => openFormWithData(row, true)),
      },
      { Header: "Sub Category Name", accessor: "subCategoryName" },
      { Header: "Description", accessor: "description" },
      {
        Header: "Created Date",
        accessor: "createdDate",
        Cell: ({ row }: any) => formatDate(row.original.createdDate),
      },
    ],
    [items]
  );

  return (
    <div className="main-page-content">
      <CustomHeader title="Expense Category Management"
       titlePrefix={<SettingsNav />}
        />

      <div className="box-container">
        <CustomSummaryBox
          divId="box-expense-category"
          title={capitalizeString("expense category")}
          data={expenseSummaryData}
          onSelect={(divId) => setSelectedBox(divId)}
          isSelected={selectedBox === "box-expense-category"}
          onFilterChange={() => {}}
          isAddShow={true}
          addButtonLable="Add Category"
          onAddClick={() => openFormWithData()}
        />
      </div>

      <CustomUtilityBox
        title="Expense Categories"
        searchHint="Search Category / Sub Category"
        onSearch={(value) => setKeyword(value)}
        onSortClick={() => {}}
        onDownloadClick={() => {}}
        onMoreClick={() => {}}
      />

      <div className="custom-dashboard-card">
        <div className="row g-2">
          <div className="col-md-6">
            <Form.Label>Search</Form.Label>
            <Form.Control value={keyword} placeholder="Category / Sub Category" onChange={(e) => setKeyword(e.target.value)} />
          </div>
          <div className="col-md-3">
            <Form.Label>Start Date</Form.Label>
            <Form.Control type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="col-md-3">
            <Form.Label>End Date</Form.Label>
            <Form.Control type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>
      </div>

      <CustomTable columns={columns} data={filtered} currentPage={1} totalPages={1} pageSize={filtered.length || 10} onPageChange={() => {}} isPagination={false} />

      <Modal show={showForm} onHide={() => setShowForm(false)} centered size="lg">
          <Modal.Header className="py-3 px-4 border-bottom-0">
            <Modal.Title as="h5" className="custom-modal-title">
              {editing ? (isViewMode ? "Expense Category Information" : "Edit Expense Category") : "Add Expense Category"}
            </Modal.Title>
            <CustomCloseButton onClose={() => setShowForm(false)} />
          </Modal.Header>
          <Modal.Body className="px-4 pb-4 pt-0" style={{ maxHeight: "70vh", overflowY: "auto" }}>
            {isViewMode && editing ? (
              <section className="custom-other-details" style={{ padding: "10px" }}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h3 className="mb-0">Expense Category</h3>
                  <i
                    className="bi bi-pencil-fill fs-6 text-danger"
                    style={{ cursor: "pointer" }}
                    onClick={() => setIsViewMode(false)}
                  />
                </div>
                <div className="row">
                  <div className="col-md-6 custom-helper-column">
                    <DetailsRow title="Category Name" value={editing.categoryName} />
                    <DetailsRow title="Sub Category Name" value={editing.subCategoryName} />
                  </div>
                  <div className="col-md-6 custom-helper-column">
                    <DetailsRow title="Created Date" value={formatDate(editing.createdDate)} />
                  </div>
                </div>
                <div className="mt-3 p-3 border rounded">
                  <div className="custom-personal-row-title mb-2">Description</div>
                  <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", color: "var(--txt-color)" }}>
                    {editing.description?.trim() || "-"}
                  </div>
                </div>
              </section>
            ) : (
              <div className="row g-2">
                <div className="col-md-12">
                  <Form.Label>Category Name</Form.Label>
                  <Form.Control value={form.categoryName} onChange={(e) => setForm((p) => ({ ...p, categoryName: e.target.value }))} />
                </div>
            <div className="col-md-12">
              <Form.Label>Sub Category Name</Form.Label>
              <Form.Control value={form.subCategoryName} onChange={(e) => setForm((p) => ({ ...p, subCategoryName: e.target.value }))} />
            </div>
            <div className="col-md-12">
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
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
                  if (!form.categoryName.trim() || !form.subCategoryName.trim()) return;
                  saveExpenseCategory(
                    {
                      categoryName: form.categoryName,
                      subCategoryName: form.subCategoryName,
                      description: form.description,
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

export default ExpenseCategoryManagement;
