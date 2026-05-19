import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";
import { useForm } from "react-hook-form";
import CustomHeader from "../../components/CustomHeader";
import CustomSummaryBox from "../../components/CustomSummaryBox";
import CustomUtilityBox from "../../components/CustomUtilityBox";
import CustomTable from "../../components/CustomTable";
import CustomCloseButton from "../../components/CustomCloseButton";
import CustomActionColumn from "../../components/CustomActionColumn";
import CustomFormSelect from "../../components/CustomFormSelect";
import { CustomFormInput } from "../../components/CustomFormInput";
import CustomDatePicker from "../../components/CustomDatePicker";
import { AppConstant, UserRole } from "../../lib/global/AppConstant";
import { PaymentEnum } from "../../lib/order/orderTypes";
import { DetailsRow, capitalizeString, formatDate } from "../../helper/utility";
import { showErrorAlert, showSuccessAlert } from "../../lib/global/alertHelper";
import { openConfirmDialog } from "../../components/CustomConfirmDialog";
import {
  ensureSettingsSeedData,
  fetchAllExpenseCategoriesWithApi,
  getExpenseCategories,
} from "../../services/settingsService";
import {
  createOrUpdateExpense,
  deleteExpenseById,
  fetchAllExpensesMatching,
  fetchExpenseById,
  fetchExpenses,
  ExpensesFilters,
} from "../../services/expensesService";
import { ExpenseModel } from "../../lib/models/ExpenseModel";
import { ExpenseCategoryModel } from "../../lib/models/SettingsModel";
import { buildExpensesCsv, downloadExpensesCsv } from "../../lib/expenses/expensesExport";
import { getLocalStorage } from "../../lib/global/localStorageHelper";
import { readHeaderFranchisePreference } from "../../lib/franchise/headerFranchisePreference";
import { fetchFranchiseDropDown } from "../../services/franchiseService";
import type { ServerTableSortBy } from "../../lib/global/serverTableSort";
import { fetchUserById } from "../../services/userService";

const toDateInputValue = (iso?: string): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

type ExpenseFormState = {
  franchiseId: string;
  categoryId: string;
  subCategoryId: string;
  categoryName: string;
  subCategoryName: string;
  expenseName: string;
  description: string;
  expenseAmount: string;
  expenseDate: string; // YYYY-MM-DD
  paymentModeId: string; // "1" | "2"
};

type ExpenseFormErrors = {
  franchiseId?: string;
  categoryId?: string;
  subCategoryId?: string;
  expenseName?: string;
  expenseDate?: string;
  paymentModeId?: string;
  expenseAmount?: string;
};

const emptyForm: ExpenseFormState = {
  franchiseId: "",
  categoryId: "",
  subCategoryId: "",
  categoryName: "",
  subCategoryName: "",
  expenseName: "",
  description: "",
  expenseAmount: "",
  expenseDate: "",
  paymentModeId: "1",
};

const ExpensesPage = () => {
  const { register, setValue } = useForm<any>();
  const currentUserRole = getLocalStorage(AppConstant.userRole);
  const isSuperAdminOrStaff =
    currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.STAFF;
  const isFranchiseScopedUser =
    currentUserRole === UserRole.FRANCHISE_ADMIN || currentUserRole === UserRole.EMPLOYEE;

  const [expenses, setExpenses] = useState<ExpenseModel[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState<"-1" | "1">("-1");
  const [sortBy, setSortBy] = useState<ServerTableSortBy>([]);
  const [filterEpoch, setFilterEpoch] = useState(0);
  // Forces `CustomUtilityBox` remount so its internal search input clears too.
  const [utilitySearchKey, setUtilitySearchKey] = useState(0);

  const [franchiseId, setFranchiseId] = useState(() =>
    readHeaderFranchisePreference()
  );
  /** Same franchise as login `partnerId` (API `franchise_id`); used to scope list + detail/delete calls for franchise admin & employee. */
  const [sessionFranchiseId, setSessionFranchiseId] = useState(() => {
    const role = getLocalStorage(AppConstant.userRole);
    if (role !== UserRole.FRANCHISE_ADMIN && role !== UserRole.EMPLOYEE) return "";
    return String(getLocalStorage(AppConstant.partnerId) ?? "").trim();
  });
  const [franchiseOptions, setFranchiseOptions] = useState<{ value: string; label: string }[]>([
    { value: "", label: "All Franchises" },
  ]);

  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategoryModel[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseModel | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [form, setForm] = useState<ExpenseFormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<ExpenseFormErrors>({});
  const fetchRef = useRef(false);

  const listParamsRef = useRef<ExpensesFilters>({});

  useEffect(() => {
    let cancelled = false;
    ensureSettingsSeedData();
    (async () => {
      const categories = await fetchAllExpenseCategoriesWithApi();
      if (cancelled) return;
      if (categories && categories.length > 0) {
        setExpenseCategories(categories);
        return;
      }
      // Fallback only when API is unavailable, to keep page usable.
      setExpenseCategories(getExpenseCategories());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isFranchiseScopedUser) {
      setSessionFranchiseId("");
      return;
    }
    let cancelled = false;
    (async () => {
      const currentUserId = String(getLocalStorage(AppConstant.createdById) ?? "").trim();
      if (!currentUserId) return;
      const res = await fetchUserById(currentUserId);
      if (cancelled || !res.response || !res.user) return;
      const fid = String((res.user as any).franchise_id ?? "").trim();
      if (fid) setSessionFranchiseId(fid);
    })();
    return () => {
      cancelled = true;
    };
  }, [isFranchiseScopedUser]);

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

  const franchiseIdToName = useMemo(() => {
    const map = new Map<string, string>();
    franchiseOptions.forEach((opt) => {
      const id = String(opt.value ?? "").trim();
      if (!id) return;
      map.set(id, opt.label);
    });
    return map;
  }, [franchiseOptions]);

  /** `GET/DELETE` expense by id require `franchise_id` query (see expense-management Postman). */
  const franchiseIdForExpenseApi = useCallback(
    (expense: ExpenseModel) => {
      const fromRow = String(expense.franchise_id ?? expense.franchiseId ?? "").trim();
      if (isFranchiseScopedUser) return fromRow;
      if (fromRow) return fromRow;
      return "";
    },
    [isFranchiseScopedUser]
  );

  const effectiveListFranchiseId = useMemo(() => {
    if (isFranchiseScopedUser) {
      return undefined;
    }
    if (!franchiseId || franchiseId === "all") {
      return undefined;
    }
    return franchiseId;
  }, [franchiseId, isFranchiseScopedUser, sessionFranchiseId]);

  const refreshListParams = useCallback(() => {
    listParamsRef.current = {
      search: keyword?.trim() ? keyword.trim() : undefined,
      franchiseId: effectiveListFranchiseId,
      sortOrder: sort === "-1" ? "desc" : "asc",
    };
  }, [effectiveListFranchiseId, keyword, sort]);

  useEffect(() => {
    refreshListParams();
  }, [refreshListParams]);

  const fetchData = useCallback(async () => {
    if (fetchRef.current) return;
    fetchRef.current = true;
    try {
      const res = await fetchExpenses(currentPage, pageSize, listParamsRef.current, { skipLoader: false }, sortBy);
      if (res.response) {
        setExpenses(res.expenses);
        setTotalPages(Math.max(1, res.totalPages || 1));
        setTotalItems(res.totalItems ?? res.expenses.length);
      } else {
        setExpenses([]);
        setTotalPages(0);
        setTotalItems(0);
      }
    } finally {
      fetchRef.current = false;
    }
  }, [currentPage, effectiveListFranchiseId, isFranchiseScopedUser, pageSize, sessionFranchiseId, sortBy]);

  useEffect(() => {
    fetchData();
  }, [fetchData, filterEpoch]);

  const prefillFormFromExpense = useCallback((expense: ExpenseModel): ExpenseFormState => {
    const categoryName = expense.category_name ?? expense.categoryName ?? "";
    const subCategoryName = expense.sub_category_name ?? expense.subCategoryName ?? "";

    return {
      franchiseId: String((expense as any).franchise_id ?? (expense as any).franchiseId ?? ""),
      categoryId: String((expense as any).category_id ?? (expense as any).categoryId ?? ""),
      subCategoryId: String((expense as any).subcategory_id ?? (expense as any).subCategoryId ?? ""),
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
  }, []);

  const handleOpenEdit = useCallback(
    async (expense?: ExpenseModel | null) => {
      setIsViewMode(false);
      if (!expense) {
        setEditingExpense(null);
        setForm({ ...emptyForm, franchiseId: isSuperAdminOrStaff ? "" : sessionFranchiseId });
        setFormErrors({});
        setShowForm(true);
        return;
      }

      const expenseId = (expense._id ?? expense.id ?? (expense as any).expense_id) as string | undefined;
      if (expenseId) {
        const fid = franchiseIdForExpenseApi(expense);
        const latest = await fetchExpenseById(expenseId, {
          skipLoader: true,
          franchiseId: fid || undefined,
        });
        if (latest.response && latest.expense) {
          setEditingExpense(latest.expense);
          setForm(prefillFormFromExpense(latest.expense));
          setFormErrors({});
        } else {
          setEditingExpense(expense);
          setForm(prefillFormFromExpense(expense));
          setFormErrors({});
        }
      } else {
        setEditingExpense(expense);
        setForm(prefillFormFromExpense(expense));
        setFormErrors({});
      }
      setShowForm(true);
    },
    [franchiseIdForExpenseApi, isSuperAdminOrStaff, prefillFormFromExpense, sessionFranchiseId]
  );

  const handleOpenView = useCallback(
    async (expense: ExpenseModel) => {
      setIsViewMode(true);
      const expenseId = (expense._id ?? expense.id ?? (expense as any).expense_id) as string | undefined;
      if (expenseId) {
        const fid = franchiseIdForExpenseApi(expense);
        const latest = await fetchExpenseById(expenseId, {
          skipLoader: true,
          franchiseId: fid || undefined,
        });
        if (latest.response && latest.expense) {
          setEditingExpense(latest.expense);
          setForm(prefillFormFromExpense(latest.expense));
          setFormErrors({});
        } else {
          setEditingExpense(expense);
          setForm(prefillFormFromExpense(expense));
          setFormErrors({});
        }
      } else {
        setEditingExpense(expense);
        setForm(prefillFormFromExpense(expense));
        setFormErrors({});
      }
      setShowForm(true);
    },
    [franchiseIdForExpenseApi, prefillFormFromExpense]
  );

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
        Header: "Category",
        accessor: "category",
        sort: true,
        Cell: ({ row }: any) => row.original.category_name ?? row.original.categoryName ?? "-",
      },
      {
        Header: "Sub Category",
        accessor: "subCategory",
        sort: true,
        Cell: ({ row }: any) => row.original.sub_category_name ?? row.original.subCategoryName ?? "-",
      },
      {
        Header: "Expense Name",
        accessor: "expenseName",
        sort: true,
        Cell: ({ row }: any) => row.original.expense_name ?? row.original.expenseName ?? "-",
      },
      ...(isSuperAdminOrStaff
        ? [
            {
              Header: "Franchise Name",
              accessor: "franchiseName",
              sort: true,
              Cell: ({ row }: any) => {
                const fromApi =
                  row.original.franchise_name ?? row.original.franchiseName;
                if (fromApi) return fromApi;
                const fid = String(
                  row.original.franchise_id ?? row.original.franchiseId ?? ""
                ).trim();
                return (fid && franchiseIdToName.get(fid)) || "-";
              },
            },
          ]
        : []),
      // {
      //   Header: "Description / Notes",
      //   accessor: "description",
      //   Cell: ({ row }: any) => row.original.description ?? (row.original as any).expense_description ?? "-",
      // },
      {
        Header: "Expense Amount",
        accessor: "expenseAmount",
        sort: true,
        Cell: ({ row }: any) => {
          const v = row.original.expense_amount ?? row.original.expenseAmount;
          return v !== undefined && v !== null ? `${AppConstant.currencySymbol}${v}` : "-";
        },
      },
      {
        Header: "Expense Date",
        accessor: "expenseDate",
        sort: true,
        Cell: ({ row }: any) =>
          row.original.expense_date ?? row.original.expenseDate ? formatDate(row.original.expense_date ?? row.original.expenseDate) : "-",
      },
      // {
      //   Header: "Payment done by",
      //   accessor: "paymentDoneBy",
      //   Cell: ({ row }: any) => {
      //     return (
      //       row.original.payment_done_by_name ??
      //       row.original.created_by_name ??
      //       row.original.payment_done_by ??
      //       row.original.created_by ??
      //       "-"
      //     );
      //   },
      // },
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
            onView={() => handleOpenView(row.original as ExpenseModel)}
            // onEdit={() => handleOpenEdit(row.original as ExpenseModel)}
            // onDelete={() => {
            //   openConfirmDialog(
            //     "Are you sure you want to void this expense?",
            //     "Void",
            //     "Cancel",
            //     async () => {
            //       const rowId =
            //         (row.original?._id ??
            //           row.original?.id ??
            //           (row.original as any)?.expense_id) as string | undefined;
            //       if (!rowId) return showErrorAlert("Invalid expense id.");
            //       const fid = franchiseIdForExpenseApi(row.original as ExpenseModel);
            //       const ok = await deleteExpenseById(rowId, fid || undefined);
            //       if (!ok) return;
            //       refreshListParams();
            //       fetchData();
            //     }
            //   );
            // }}
          />
        ),
      },
    ],
    [
      currentPage,
      fetchData,
      franchiseIdForExpenseApi,
      franchiseIdToName,
      handleOpenEdit,
      handleOpenView,
      isSuperAdminOrStaff,
      pageSize,
      refreshListParams,
    ]
  );

  const handleSaveExpense = async () => {
    const categoryName = form.categoryName.trim();
    const subCategoryName = form.subCategoryName.trim();
    const expenseName = form.expenseName.trim();
    const description = form.description.trim();
    const expenseAmountNum = Number(form.expenseAmount);
    const expenseDateYmd = form.expenseDate || "";
    const paymentModeIdNum = Number(form.paymentModeId);

    const nextErrors: ExpenseFormErrors = {};
    if (isSuperAdminOrStaff && !form.franchiseId.trim()) {
      nextErrors.franchiseId = "Franchise is required";
    }
    if (!form.categoryId.trim() || !categoryName) {
      nextErrors.categoryId = "Category is required";
    }
    if (!form.subCategoryId.trim() || !subCategoryName) {
      nextErrors.subCategoryId = "Sub Category is required";
    }
    if (!expenseName) {
      nextErrors.expenseName = "Expense Name is required";
    }
    if (!form.expenseDate) {
      nextErrors.expenseDate = "Expense Date is required";
    }
    if (!form.paymentModeId) {
      nextErrors.paymentModeId = "Payment Mode is required";
    }
    if (Number.isNaN(expenseAmountNum) || expenseAmountNum <= 0) {
      nextErrors.expenseAmount = "Expense Amount must be greater than 0";
    }
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    if (Number.isNaN(paymentModeIdNum)) {
      return showErrorAlert("Invalid Payment Mode");
    }

    const selectedCategory = expenseCategories.find(
      (item) =>
        item.categoryName === categoryName &&
        item.subCategoryName === subCategoryName
    );

    const categoryId = form.categoryId || selectedCategory?.categoryId || selectedCategory?.id || "";
    const subCategoryId = form.subCategoryId || selectedCategory?.subCategoryId || "";
    const payloadFranchiseId = isSuperAdminOrStaff ? form.franchiseId.trim() : sessionFranchiseId.trim();

    if (!categoryId) return showErrorAlert("Category id not found for selected category.");
    if (!subCategoryId) return showErrorAlert("Sub category id not found for selected sub category.");
    if (!payloadFranchiseId) return showErrorAlert("Franchise not found.");

    const payload = {
      franchise_id: payloadFranchiseId,
      category_id: categoryId,
      subcategory_id: subCategoryId,
      expense_name: expenseName,
      description,
      expense_amount: expenseAmountNum,
      expense_date: expenseDateYmd,
      payment_mode: PaymentEnum.get(paymentModeIdNum)?.label ?? "COD",
    };

    const id = (editingExpense?._id ?? editingExpense?.id ?? (editingExpense as any)?.expense_id) as string | undefined;
    const ok = await createOrUpdateExpense(payload, Boolean(editingExpense), id);
    if (ok) {
      setShowForm(false);
      setIsViewMode(false);
      setEditingExpense(null);
      setFormErrors({});
      // Force refresh even if currentPage/filters stay the same.
      setCurrentPage(1);
      setTotalPages(0);
      setTotalItems(0);
      refreshListParams();
      fetchData();
    }
  };

  const clearExpensesDisabled = !keyword?.trim() && sort === "-1";

  const clearExpensesFilters = () => {
    setKeyword("");
    setSort("-1");
    setSortBy([]);
    setCurrentPage(1);
    setFilterEpoch((k) => k + 1);
    setUtilitySearchKey((k) => k + 1);
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
          data={{ Total: totalItems }}
          onSelect={() => {}}
          isSelected={true}
          onFilterChange={() => {}}
          isAddShow={true}
          addButtonLable="Add Expense"
          onAddClick={() => handleOpenEdit(null)}
        />
      </div>

      <CustomUtilityBox
        key={`expenses-utility-${utilitySearchKey}`}
        title="Expenses"
        searchHint="Search expense name, category, sub category"
        toolsInlineRow
        toolsInlineClassName="custom-utilty-tools-inline--expenses-wide-search"
        hideMoreIcon
        afterSearchSlot={
          <Button
            variant="outline-secondary"
            size="sm"
            className="custom-btn-secondary partner-payout-clear-btn px-3"
            type="button"
            disabled={clearExpensesDisabled}
            onClick={clearExpensesFilters}
          >
            Clear
          </Button>
        }
        onSearch={(value) => {
          setKeyword(value);
          setCurrentPage(1);
          setFilterEpoch((k) => k + 1);
        }}
        syncKeyword={keyword}
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
        manualSortBy
        sortBy={sortBy}
        onSortChange={(next) => {
          setSortBy(next);
          setCurrentPage(1);
          setFilterEpoch((k) => k + 1);
        }}
        theadClass="table-light"
      />

      <Modal
        show={showForm}
        onHide={() => {
          setShowForm(false);
          setIsViewMode(false);
          setFormErrors({});
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
              setFormErrors({});
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
                  {/* <DetailsRow
                    title="Payment done by"
                    value={
                      editingExpense.payment_done_by_name ??
                      editingExpense.created_by_name ??
                      editingExpense.payment_done_by ??
                      editingExpense.created_by ??
                      "-"
                    }
                  /> */}
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
            <>
            <div className="row g-2">
              {isSuperAdminOrStaff && (
                <div className="col-md-6">
                  <CustomFormSelect
                    label="Franchise"
                    controlId="expense_modal_franchise"
                    options={[
                      { value: "", label: "Select Franchise" },
                      ...franchiseOptions
                        // In this modal, do not show "All Franchises" / any non-specific option.
                        .filter((item) => item.value !== "all" && item.value !== "")
                        .map((item) => ({ value: item.value, label: item.label })),
                    ]}
                    register={register}
                    fieldName="expense_modal_franchise"
                    asCol={false}
                    defaultValue={form.franchiseId}
                    error={
                      formErrors.franchiseId
                        ? ({ message: formErrors.franchiseId } as any)
                        : undefined
                    }
                    setValue={setValue}
                    onChange={(e) => {
                      setForm((p) => ({ ...p, franchiseId: e.target.value }));
                      setFormErrors((prev) => ({ ...prev, franchiseId: undefined }));
                    }}
                    menuPortal
                  />
                </div>
              )}
             </div>
             <div className="row g-2">
              <div className="col-md-6">
                <CustomFormSelect
                  label="Category"
                  controlId="expense_modal_category"
                  options={[
                    { value: "", label: "Select Category" },
                    ...Array.from(
                      new Map(
                        expenseCategories.map((c) => [
                          c.categoryId || c.id,
                          { value: c.categoryId || c.id, label: c.categoryName },
                        ])
                      ).values()
                    ),
                  ]}
                  register={register}
                  fieldName="expense_modal_category"
                  asCol={false}
                  defaultValue={form.categoryId}
                  error={
                    formErrors.categoryId
                      ? ({ message: formErrors.categoryId } as any)
                      : undefined
                  }
                  setValue={setValue}
                  onChange={(e) => {
                    const newCategoryId = e.target.value;
                    const pickedCategory = expenseCategories.find(
                      (item) => (item.categoryId || item.id) === newCategoryId
                    );
                    setForm((p) => ({
                      ...p,
                      categoryId: newCategoryId,
                      categoryName: pickedCategory?.categoryName || "",
                      subCategoryId: "",
                      subCategoryName: "",
                    }));
                    setFormErrors((prev) => ({
                      ...prev,
                      categoryId: undefined,
                      subCategoryId: undefined,
                    }));
                  }}
                />
              </div>

              <div className="col-md-6">
                <div
                  style={{
                    pointerEvents: form.categoryName ? "auto" : "none",
                    opacity: form.categoryName ? 1 : 0.65,
                  }}
                >
                  <CustomFormSelect
                    label="Sub Category"
                    controlId="expense_modal_sub_category"
                    options={[
                      {
                        value: "",
                        label: form.categoryId ? "Select Sub Category" : "Select Category first",
                      },
                      ...expenseCategories
                        .filter((item) => (item.categoryId || item.id) === form.categoryId)
                        .map((item) => ({
                          value: item.subCategoryId || "",
                          label: item.subCategoryName,
                        }))
                        .filter((item) => Boolean(item.value)),
                    ]}
                    register={register}
                    fieldName="expense_modal_sub_category"
                    asCol={false}
                    defaultValue={form.subCategoryId}
                    error={
                      formErrors.subCategoryId
                        ? ({ message: formErrors.subCategoryId } as any)
                        : undefined
                    }
                    setValue={setValue}
                    onChange={(e) => {
                      const newSubCategoryId = e.target.value;
                      const pickedSubCategory = expenseCategories.find(
                        (item) =>
                          (item.categoryId || item.id) === form.categoryId &&
                          (item.subCategoryId || "") === newSubCategoryId
                      );
                      setForm((p) => ({
                        ...p,
                        subCategoryId: newSubCategoryId,
                        subCategoryName: pickedSubCategory?.subCategoryName || "",
                      }));
                      setFormErrors((prev) => ({ ...prev, subCategoryId: undefined }));
                    }}
                  />
                </div>
              </div>

              <div className="col-md-12">
                <CustomFormInput
                  label="Expense Name"
                  controlId="expense_modal_expense_name"
                  placeholder="Enter Expense Name"
                  register={register}
                  asCol={false}
                  error={
                    formErrors.expenseName
                      ? ({ message: formErrors.expenseName } as any)
                      : undefined
                  }
                  value={form.expenseName}
                  onChange={(value) => {
                    setForm((p) => ({ ...p, expenseName: value }));
                    setFormErrors((prev) => ({ ...prev, expenseName: undefined }));
                  }}
                />
              </div>

              <div className="col-md-12">
                <CustomFormInput
                  label="Description / Notes"
                  controlId="expense_modal_description"
                  placeholder="Enter Description / Notes"
                  register={register}
                  asCol={false}
                  value={form.description}
                  as="textarea"
                  rows={4}
                  onChange={(value) => setForm((p) => ({ ...p, description: value }))}
                />
              </div>

              <div className="col-md-6">
                <CustomFormInput
                  label="Expense Amount"
                  controlId="expense_modal_expense_amount"
                  placeholder="Enter Expense Amount"
                  register={register}
                  asCol={false}
                  inputType="text"
                  error={
                    formErrors.expenseAmount
                      ? ({ message: formErrors.expenseAmount } as any)
                      : undefined
                  }
                  value={form.expenseAmount}
                  onChange={(value) => {
                    // Only digits; blocks negative sign and non-numeric chars.
                    const cleaned = String(value ?? "").replace(/[^\d]/g, "");
                    setForm((p) => ({ ...p, expenseAmount: cleaned }));
                    setFormErrors((prev) => ({ ...prev, expenseAmount: undefined }));
                  }}
                />
              </div>

              <div className="col-md-6">
                <Form.Label className="mb-1 fw-medium">Expense Date</Form.Label>
                <CustomDatePicker
                  label=""
                  controlId="expense_modal_expense_date"
                  selectedDate={form.expenseDate || null}
                  error={formErrors.expenseDate}
                  onChange={(date) => {
                    const value = date
                      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
                          date.getDate()
                        ).padStart(2, "0")}`
                      : "";
                    setForm((p) => ({ ...p, expenseDate: value }));
                    setFormErrors((prev) => ({ ...prev, expenseDate: undefined }));
                  }}
                  register={register}
                  setValue={setValue}
                  asCol={false}
                  groupClassName="mb-0 w-100"
                  placeholderText="Expense Date"
                  filterDate={() => true}
                />
              </div>

              <div className="col-md-12">
                <CustomFormSelect
                  label="Payment Mode"
                  controlId="expense_modal_payment_mode"
                  options={paymentModeOptions}
                  register={register}
                  fieldName="expense_modal_payment_mode"
                  asCol={false}
                  defaultValue={form.paymentModeId}
                  error={
                    formErrors.paymentModeId
                      ? ({ message: formErrors.paymentModeId } as any)
                      : undefined
                  }
                  setValue={setValue}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, paymentModeId: e.target.value }));
                    setFormErrors((prev) => ({ ...prev, paymentModeId: undefined }));
                  }}
                />
              </div>
            </div>
            </>
          )}
        </Modal.Body>

        {!isViewMode && (
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => {
                setShowForm(false);
                setFormErrors({});
              }}
            >
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

