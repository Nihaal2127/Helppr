import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";
import { useForm } from "react-hook-form";
import CustomHeader from "../../components/CustomHeader";
import CustomSummaryBox from "../../components/CustomSummaryBox";
import CustomUtilityBox from "../../components/CustomUtilityBox";
import CustomTable from "../../components/CustomTable";
import CustomCloseButton from "../../components/CustomCloseButton";
import CustomActionColumn from "../../components/CustomActionColumn";
import { AppConstant } from "../../constant/AppConstant";
import { PaymentEnum } from "../../constant/PaymentEnum";
import { DetailsRow, capitalizeString, formatDate } from "../../helper/utility";
import { showErrorAlert, showSuccessAlert } from "../../helper/alertHelper";
import { openConfirmDialog } from "../../components/CustomConfirmDialog";
import { ensureSettingsSeedData, getExpenseCategories } from "../../services/settingsService";
import { createOrUpdateExpense, fetchAllExpensesMatching, fetchExpenses, ExpensesFilters } from "../../services/expensesService";
import { ExpenseModel } from "../../models/ExpenseModel";
import { ExpenseCategoryModel } from "../../models/SettingsModel";
import { buildExpensesCsv, downloadExpensesCsv } from "../../helper/expensesExport";
import { getLocalStorage } from "../../helper/localStorageHelper";
import { fetchFranchiseDropDown } from "../../services/franchiseService";

const toDateInputValue = (iso?: string): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

type ExpenseFormState = {
  categoryName: string;
  subCategoryName: string;
  expenseName: string;
  description: string;
  expenseAmount: string;
  expenseDate: string; // YYYY-MM-DD
  paymentModeId: string; // "1" | "2"
};

const emptyForm: ExpenseFormState = {
  categoryName: "",
  subCategoryName: "",
  expenseName: "",
  description: "",
  expenseAmount: "",
  expenseDate: "",
  paymentModeId: "1",
};

const DUMMY_EXPENSES: ExpenseModel[] = [
  {
    _id: "EXP-001",
    category_name: "Office Expense",
    sub_category_name: "Internet",
    expense_name: "Internet Bill",
    description: "Monthly broadband charges",
    expense_amount: 2500,
    expense_date: "2026-03-01T00:00:00.000Z",
    payment_mode_id: 2,
    payment_done_by_name: "Admin",
    created_by_name: "Admin",
  },
  {
    _id: "EXP-002",
    category_name: "Office Expense",
    sub_category_name: "Internet",
    expense_name: "Internet - Maintenance",
    description: "Monthly power consumption",
    expense_amount: 1800,
    expense_date: "2026-03-10T00:00:00.000Z",
    payment_mode_id: 1,
    payment_done_by_name: "Accounts",
    created_by_name: "Accounts",
  },
  {
    _id: "EXP-003",
    category_name: "Office Expense",
    sub_category_name: "Internet",
    expense_name: "Router Maintenance",
    description: "Service & replacement",
    expense_amount: 950,
    expense_date: "2026-03-18T00:00:00.000Z",
    payment_mode_id: 2,
    payment_done_by_name: "Admin",
    created_by_name: "Admin",
  },
];

const ExpensesPage = () => {
  const { register, setValue } = useForm<any>();

  const [expenses, setExpenses] = useState<ExpenseModel[]>(DUMMY_EXPENSES);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [keyword, setKeyword] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSubCategory, setFilterSubCategory] = useState("");
  const [sort, setSort] = useState<"-1" | "1">("-1");

  const [franchiseId, setFranchiseId] = useState("");
  const [franchiseOptions, setFranchiseOptions] = useState<{ value: string; label: string }[]>([
    { value: "", label: "All Franchises" },
  ]);

  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategoryModel[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseModel | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [form, setForm] = useState<ExpenseFormState>(emptyForm);
  const fetchRef = useRef(false);

  const listParamsRef = useRef<ExpensesFilters>({});

  useEffect(() => {
    ensureSettingsSeedData();
    setExpenseCategories(getExpenseCategories());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const franchises = await fetchFranchiseDropDown();
        if (cancelled) return;
        setFranchiseOptions([{ value: "", label: "All Franchises" }, ...franchises]);
      } catch {
        // Fallback to the initial static "All Franchises" option.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryOptions = useMemo(() => {
    const unique = Array.from(new Set(expenseCategories.map((c) => c.categoryName).filter(Boolean)));
    return unique.sort((a, b) => a.localeCompare(b));
  }, [expenseCategories]);

  const subCategoryOptionsFor = useCallback(
    (categoryName: string) => {
      const unique = Array.from(
        new Set(
          expenseCategories
            .filter((c) => c.categoryName === categoryName)
            .map((c) => c.subCategoryName)
            .filter(Boolean)
        )
      );
      return unique.sort((a, b) => a.localeCompare(b));
    },
    [expenseCategories]
  );

  const refreshListParams = useCallback(() => {
    listParamsRef.current = {
      keyword: keyword?.trim() ? keyword.trim() : undefined,
      category: filterCategory || undefined,
      subCategory: filterSubCategory || undefined,
      franchiseId: franchiseId || undefined,
      sort: sort || undefined,
    };
  }, [filterCategory, filterSubCategory, franchiseId, keyword, sort]);

  useEffect(() => {
    refreshListParams();
  }, [refreshListParams]);

  const dummyFilteredExpenses = useMemo(() => {
    const keywordTrimmed = keyword?.trim().toLowerCase() || "";

    const parsedExpenseDate = (e: ExpenseModel): Date | null => {
      const raw = (e.expense_date ?? e.expenseDate) as string | undefined;
      if (!raw) return null;
      const d = new Date(raw);
      return Number.isNaN(d.getTime()) ? null : d;
    };

    let data = [...DUMMY_EXPENSES];

    if (keywordTrimmed) {
      data = data.filter((e) =>
        String(e.expense_name ?? e.expenseName ?? "")
          .toLowerCase()
          .includes(keywordTrimmed)
      );
    }

    if (filterCategory) {
      data = data.filter((e) => (e.category_name ?? e.categoryName) === filterCategory);
    }

    if (filterSubCategory) {
      data = data.filter((e) => (e.sub_category_name ?? e.subCategoryName) === filterSubCategory);
    }

    data.sort((a, b) => {
      const ad = parsedExpenseDate(a)?.getTime() ?? 0;
      const bd = parsedExpenseDate(b)?.getTime() ?? 0;
      return sort === "1" ? ad - bd : bd - ad;
    });

    return data;
  }, [filterCategory, filterSubCategory, keyword, sort]);

  const fetchData = useCallback(async () => {
    if (fetchRef.current) return;
    fetchRef.current = true;
    try {
      const res = await fetchExpenses(currentPage, pageSize, listParamsRef.current, { skipLoader: false });
      if (res.response) {
        if (res.expenses?.length) {
          setExpenses(res.expenses);
          setTotalPages(Math.max(1, res.totalPages || 1));
        } else {
          setExpenses(dummyFilteredExpenses);
          setTotalPages(Math.max(1, Math.ceil(dummyFilteredExpenses.length / pageSize)));
        }
      } else {
        setExpenses(dummyFilteredExpenses);
        setTotalPages(Math.max(1, Math.ceil(dummyFilteredExpenses.length / pageSize)));
      }
    } finally {
      fetchRef.current = false;
    }
  }, [currentPage, dummyFilteredExpenses, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const prefillFormFromExpense = (expense: ExpenseModel): ExpenseFormState => {
    const categoryName = expense.category_name ?? expense.categoryName ?? "";
    const subCategoryName = expense.sub_category_name ?? expense.subCategoryName ?? "";

    return {
      categoryName,
      subCategoryName,
      expenseName: expense.expense_name ?? expense.expenseName ?? "",
      description: expense.description ?? (expense as any).expense_description ?? "",
      expenseAmount:
        expense.expense_amount !== undefined && expense.expense_amount !== null
          ? String(expense.expense_amount)
          : expense.expenseAmount !== undefined && expense.expenseAmount !== null
            ? String(expense.expenseAmount)
            : "",
      expenseDate: toDateInputValue(expense.expense_date ?? expense.expenseDate),
      paymentModeId:
        expense.payment_mode_id !== undefined && expense.payment_mode_id !== null
          ? String(expense.payment_mode_id)
          : expense.paymentModeId !== undefined && expense.paymentModeId !== null
            ? String(expense.paymentModeId)
            : "1",
    };
  };

  const handleOpenEdit = (expense?: ExpenseModel | null) => {
    setIsViewMode(false);
    if (!expense) {
      setEditingExpense(null);
      setForm(emptyForm);
      setShowForm(true);
      return;
    }

    setEditingExpense(expense);
    setForm(prefillFormFromExpense(expense));
    setShowForm(true);
  };

  const handleOpenView = (expense: ExpenseModel) => {
    setIsViewMode(true);
    setEditingExpense(expense);
    setForm(prefillFormFromExpense(expense));
    setShowForm(true);
  };

  const selectedModalSubCategories = useMemo(() => {
    return subCategoryOptionsFor(form.categoryName);
  }, [form.categoryName, subCategoryOptionsFor]);

  const paymentModeOptions = useMemo(() => {
    return Array.from(PaymentEnum.entries()).map(([id, v]) => ({ value: String(id), label: v.label }));
  }, []);

  const expensesColumns = useMemo(
    () => [
      {
        Header: "SR No",
        accessor: "sr",
        Cell: ({ row }: any) => (currentPage - 1) * pageSize + row.index + 1,
      },
      {
        Header: "Expense ID",
        accessor: "expenseId",
        Cell: ({ row }: any) =>
          (() => {
            const value = row.original._id ?? row.original.id ?? (row.original as any).expense_id ?? "-";
            return (
              <span
                style={{
                  textDecoration: "underline",
                  textDecorationThickness: "1px",
                  cursor: "pointer",
                }}
                onClick={() => handleOpenView(row.original as ExpenseModel)}
              >
                {value}
              </span>
            );
          })(),
      },
      {
        Header: "Category",
        accessor: "category",
        Cell: ({ row }: any) => row.original.category_name ?? row.original.categoryName ?? "-",
      },
      {
        Header: "Sub Category",
        accessor: "subCategory",
        Cell: ({ row }: any) => row.original.sub_category_name ?? row.original.subCategoryName ?? "-",
      },
      {
        Header: "Expense Name",
        accessor: "expenseName",
        Cell: ({ row }: any) => row.original.expense_name ?? row.original.expenseName ?? "-",
      },
      {
        Header: "Description / Notes",
        accessor: "description",
        Cell: ({ row }: any) => row.original.description ?? (row.original as any).expense_description ?? "-",
      },
      {
        Header: "Expense Amount",
        accessor: "expenseAmount",
        Cell: ({ row }: any) => {
          const v = row.original.expense_amount ?? row.original.expenseAmount;
          return v !== undefined && v !== null ? `${AppConstant.currencySymbol}${v}` : "-";
        },
      },
      {
        Header: "Expense Date",
        accessor: "expenseDate",
        Cell: ({ row }: any) =>
          row.original.expense_date ?? row.original.expenseDate ? formatDate(row.original.expense_date ?? row.original.expenseDate) : "-",
      },
      {
        Header: "Payment done by",
        accessor: "paymentDoneBy",
        Cell: ({ row }: any) => {
          return (
            row.original.payment_done_by_name ??
            row.original.created_by_name ??
            row.original.payment_done_by ??
            row.original.created_by ??
            "-"
          );
        },
      },
      {
        Header: "Payment mode",
        accessor: "paymentMode",
        Cell: ({ row }: any) => {
          const id = row.original.payment_mode_id ?? row.original.paymentModeId;
          const mapped = id !== undefined && id !== null && id !== "" ? PaymentEnum.get(Number(id)) : undefined;
          return mapped?.label ?? row.original.payment_mode ?? row.original.paymentMode ?? "-";
        },
      },
      {
        Header: "Action",
        accessor: "action",
        Cell: ({ row }: any) => (
          <CustomActionColumn
            row={row}
            onDelete={() => {
              openConfirmDialog(
                "Are you sure you want to void this expense?",
                "Void",
                "Cancel",
                async () => {
                  const rowId =
                    (row.original?._id ??
                      row.original?.id ??
                      (row.original as any)?.expense_id) as string | undefined;

                  if (!rowId) return;

                  setExpenses((prev) =>
                    prev.filter(
                      (item) =>
                        (item._id ?? item.id ?? (item as any).expense_id) !== rowId
                    )
                  );
                  showSuccessAlert("Expense voided successfully");
                }
              );
            }}
          />
        ),
      },
    ],
    [currentPage, pageSize]
  );

  const handleSaveExpense = async () => {
    const categoryName = form.categoryName.trim();
    const subCategoryName = form.subCategoryName.trim();
    const expenseName = form.expenseName.trim();
    const description = form.description.trim();
    const expenseAmountNum = Number(form.expenseAmount);
    const expenseDateIso = form.expenseDate ? new Date(form.expenseDate).toISOString() : "";
    const paymentModeIdNum = Number(form.paymentModeId);

    if (!categoryName) return showErrorAlert("Please select Category");
    if (!subCategoryName) return showErrorAlert("Please select Sub Category");
    if (!expenseName) return showErrorAlert("Please enter Expense Name");
    if (!form.expenseDate) return showErrorAlert("Please select Expense Date");
    if (!form.paymentModeId) return showErrorAlert("Please select Payment Mode");
    if (Number.isNaN(expenseAmountNum) || expenseAmountNum <= 0) {
      return showErrorAlert("Expense Amount must be greater than 0");
    }
    if (Number.isNaN(paymentModeIdNum)) {
      return showErrorAlert("Invalid Payment Mode");
    }

    const payload = {
      category_name: categoryName,
      sub_category_name: subCategoryName,
      expense_name: expenseName,
      description,
      expense_amount: expenseAmountNum,
      expense_date: expenseDateIso,
      payment_mode_id: paymentModeIdNum,
      created_by_id: getLocalStorage(AppConstant.createdById),
    };

    const id = (editingExpense?._id ?? editingExpense?.id ?? (editingExpense as any)?.expense_id) as string | undefined;
    const ok = await createOrUpdateExpense(payload, Boolean(editingExpense), id);
    if (ok) {
      setShowForm(false);
      setIsViewMode(false);
      setEditingExpense(null);
      // Force refresh even if currentPage/filters stay the same.
      setCurrentPage(1);
      setTotalPages(0);
      refreshListParams();
      fetchData();
    }
  };

  const handleDownload = async () => {
    try {
      const filters = listParamsRef.current;
      const rows = await fetchAllExpensesMatching(filters, 250, { skipLoader: true });
      if (!rows) return;
      const csv = buildExpensesCsv(rows);
      downloadExpensesCsv("Expenses.csv", csv);
      showSuccessAlert("Download successfully");
    } catch (e: any) {
      showErrorAlert(e?.message || "Failed to download expenses");
    }
  };

  return (
    <div className="main-page-content">
      <CustomHeader
        title="Expenses Management"
        register={register}
        setValue={setValue}
        onLocationChange={(selectedFranchiseId) => {
          setFranchiseId(selectedFranchiseId);
          setCurrentPage(1);
        }}
      />

      <div className="box-container">
        <CustomSummaryBox
          divId="box-expenses"
          title={capitalizeString("expenses")}
          data={{ Total: expenses.length }}
          onSelect={() => {}}
          isSelected={true}
          onFilterChange={() => {}}
          isAddShow={true}
          addButtonLable="Add Expense"
          onAddClick={() => handleOpenEdit(null)}
        />
      </div>

      <CustomUtilityBox
        title="Expenses"
        searchHint="Search Expense Name"
        toolsInlineRow
        hideMoreIcon
        controlSlot={
          <>
            <div>
              <Form.Label className="mb-1 small text-muted">Category</Form.Label>
              <Form.Select
                size="sm"
                value={filterCategory}
                onChange={(e) => {
                  setFilterCategory(e.target.value);
                  setFilterSubCategory("");
                  setCurrentPage(1);
                }}
                style={{
                  minWidth: "11rem",
                  height: "2.62rem",
                  borderColor: "var(--primary-color)",
                  borderRadius: "8px",
                  fontSize: "14px",
                  backgroundColor: "var(--bg-color)",
                  color: "var(--content-txt-color)",
                }}
              >
                <option value="">All</option>
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Form.Select>
            </div>
            <div>
              <Form.Label className="mb-1 small text-muted">Sub Category</Form.Label>
              <Form.Select
                size="sm"
                value={filterSubCategory}
                onChange={(e) => {
                  setFilterSubCategory(e.target.value);
                  setCurrentPage(1);
                }}
                disabled={!filterCategory}
                style={{
                  minWidth: "11rem",
                  height: "2.62rem",
                  borderColor: "var(--primary-color)",
                  borderRadius: "8px",
                  fontSize: "14px",
                  backgroundColor: "var(--bg-color)",
                  color: "var(--content-txt-color)",
                  opacity: filterCategory ? 1 : 0.65,
                }}
              >
                <option value="">{!filterCategory ? "Select Category first" : "All"}</option>
                {filterCategory &&
                  subCategoryOptionsFor(filterCategory).map((sc) => (
                    <option key={sc} value={sc}>
                      {sc}
                    </option>
                  ))}
              </Form.Select>
            </div>
          </>
        }
        onSearch={(value) => {
          setKeyword(value);
          setCurrentPage(1);
        }}
        onSortClick={(value) => {
          setSort(value);
          setCurrentPage(1);
        }}
        onDownloadClick={handleDownload}
        onMoreClick={() => {}}
      />

      <CustomTable
        columns={expensesColumns}
        data={expenses}
        pageSize={pageSize}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(page: number) => setCurrentPage(page)}
        onLimitChange={(newPageSize: number) => {
          setPageSize(newPageSize);
          setCurrentPage(1);
        }}
        theadClass="table-light"
      />

      <Modal
        show={showForm}
        onHide={() => {
          setShowForm(false);
          setIsViewMode(false);
        }}
        centered
        size="lg"
      >
        <Modal.Header className="py-3 px-4 border-bottom-0">
          <Modal.Title as="h5" className="custom-modal-title">
            {isViewMode ? "Expense Details" : editingExpense ? "Edit Expense" : "Add Expense"}
          </Modal.Title>
          <CustomCloseButton
            onClose={() => {
              setShowForm(false);
              setIsViewMode(false);
            }}
          />
        </Modal.Header>

        <Modal.Body className="px-4 pb-4 pt-0" style={{ maxHeight: "70vh", overflowY: "auto" }}>
          {isViewMode && editingExpense ? (
            <section className="custom-other-details" style={{ padding: "10px" }}>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h3 className="mb-0">Expense Information</h3>
                <i
                  className="bi bi-pencil-fill fs-6 text-danger"
                  style={{ cursor: "pointer" }}
                  onClick={() => setIsViewMode(false)}
                ></i>
              </div>

              <div className="row">
                <div className="col-md-6 custom-helper-column">
                  <DetailsRow
                    title="Expense ID"
                    value={editingExpense._id ?? editingExpense.id ?? (editingExpense as any).expense_id ?? "-"}
                  />
                  <DetailsRow title="Category" value={editingExpense.category_name ?? editingExpense.categoryName ?? "-"} />
                  <DetailsRow title="Sub Category" value={editingExpense.sub_category_name ?? editingExpense.subCategoryName ?? "-"} />
                  <DetailsRow title="Expense Name" value={editingExpense.expense_name ?? editingExpense.expenseName ?? "-"} />
                </div>

                <div className="col-md-6 custom-helper-column">
                  <DetailsRow
                    title="Expense Amount"
                    value={
                      (() => {
                        const amt = editingExpense.expense_amount ?? editingExpense.expenseAmount;
                        return amt !== undefined && amt !== null
                          ? `${AppConstant.currencySymbol}${amt}`
                          : "-";
                      })()
                    }
                  />
                  <DetailsRow
                    title="Expense Date"
                    value={formatDate(editingExpense.expense_date ?? (editingExpense as any).expenseDate ?? "")}
                  />
                  <DetailsRow
                    title="Payment done by"
                    value={
                      editingExpense.payment_done_by_name ??
                      editingExpense.created_by_name ??
                      editingExpense.payment_done_by ??
                      editingExpense.created_by ??
                      "-"
                    }
                  />
                  <DetailsRow
                    title="Payment mode"
                    value={
                      (() => {
                        const id = editingExpense.payment_mode_id ?? editingExpense.paymentModeId;
                        if (id !== undefined && id !== null && id !== "") {
                          return PaymentEnum.get(Number(id))?.label ?? "-";
                        }
                        return editingExpense.payment_mode ?? editingExpense.paymentMode ?? "-";
                      })()
                    }
                  />
                </div>
              </div>

              <div className="mt-3 p-3 border rounded">
                <div className="custom-personal-row-title mb-2">Description / Notes</div>
                <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", color: "var(--txt-color)" }}>
                  {editingExpense.description ?? (editingExpense as any).expense_description ?? "-" }
                </div>
              </div>
            </section>
          ) : (
            <div className="row g-2">
              <div className="col-md-6">
                <Form.Label>Category</Form.Label>
                <Form.Select
                  value={form.categoryName}
                  onChange={(e) => {
                    const newCategory = e.target.value;
                    setForm((p) => ({
                      ...p,
                      categoryName: newCategory,
                      subCategoryName: "",
                    }));
                  }}
                >
                  <option value="">Select Category</option>
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Form.Select>
              </div>

              <div className="col-md-6">
                <Form.Label>Sub Category</Form.Label>
                <Form.Select
                  value={form.subCategoryName}
                  onChange={(e) => setForm((p) => ({ ...p, subCategoryName: e.target.value }))}
                  disabled={!form.categoryName}
                >
                  <option value="">
                    {!form.categoryName ? "Select Category first" : "Select Sub Category"}
                  </option>
                  {selectedModalSubCategories.map((sc) => (
                    <option key={sc} value={sc}>
                      {sc}
                    </option>
                  ))}
                </Form.Select>
              </div>

              <div className="col-md-12">
                <Form.Label>Expense Name</Form.Label>
                <Form.Control
                  type="text"
                  value={form.expenseName}
                  placeholder="Enter Expense Name"
                  onChange={(e) => setForm((p) => ({ ...p, expenseName: e.target.value }))}
                />
              </div>

              <div className="col-md-12">
                <Form.Label>Description / Notes</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={form.description}
                  placeholder="Enter Description / Notes"
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>

              <div className="col-md-6">
                <Form.Label>Expense Amount</Form.Label>
                <Form.Control
                  type="number"
                  value={form.expenseAmount}
                  placeholder="Enter Expense Amount"
                  min={0}
                  step="0.01"
                  onChange={(e) => setForm((p) => ({ ...p, expenseAmount: e.target.value }))}
                />
              </div>

              <div className="col-md-6">
                <Form.Label>Expense Date</Form.Label>
                <Form.Control
                  type="date"
                  value={form.expenseDate}
                  onChange={(e) => setForm((p) => ({ ...p, expenseDate: e.target.value }))}
                />
              </div>

              <div className="col-md-12">
                <Form.Label>Payment Mode</Form.Label>
                <Form.Select
                  value={form.paymentModeId}
                  onChange={(e) => setForm((p) => ({ ...p, paymentModeId: e.target.value }))}
                >
                  {paymentModeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Form.Select>
              </div>
            </div>
          )}
        </Modal.Body>

        {!isViewMode && (
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button className="btn-danger" onClick={handleSaveExpense}>
              {editingExpense ? "Update" : "Save"}
            </Button>
          </Modal.Footer>
        )}
      </Modal>
    </div>
  );
};

export default ExpensesPage;

