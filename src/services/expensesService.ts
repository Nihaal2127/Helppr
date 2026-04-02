import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";
import { ExpenseModel } from "../models/ExpenseModel";
import { showLog } from "../helper/utility";

export type ExpensesFilters = {
  keyword?: string;
  category?: string;
  subCategory?: string;
  franchiseId?: string;
  fromDate?: string;
  toDate?: string;
  sort?: string;
};

const parseExpensesResponse = (payload: any): { records: ExpenseModel[]; totalPages: number; totalItems?: number } => {
  const d = payload ?? {};
  const inner = d.data != null && typeof d.data === "object" && !Array.isArray(d.data) ? d.data : {};
  const records = inner.records ?? d.records ?? [];
  const totalPagesVal = inner.totalPages ?? d.totalPages ?? 0;
  const totalItemsRaw = inner.totalItems ?? d.totalItems;
  const totalItems =
    totalItemsRaw === undefined || totalItemsRaw === null || totalItemsRaw === ""
      ? undefined
      : Number(totalItemsRaw);

  return {
    records: Array.isArray(records) ? records : [],
    totalPages: Number(totalPagesVal) || 0,
    totalItems: totalItems !== undefined && !Number.isNaN(totalItems) ? totalItems : undefined,
  };
};

export const fetchExpenses = async (
  page: number,
  pageSize: number,
  filters: ExpensesFilters,
  requestOpts?: { skipLoader?: boolean }
): Promise<{ response: boolean; expenses: ExpenseModel[]; totalPages: number; totalItems?: number }> => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
    ...(filters.keyword ? { keyword: filters.keyword } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.subCategory ? { subCategory: filters.subCategory } : {}),
    ...(filters.franchiseId ? { franchise_id: filters.franchiseId } : {}),
    ...(filters.fromDate ? { fromDate: filters.fromDate } : {}),
    ...(filters.toDate ? { toDate: filters.toDate } : {}),
    ...(filters.sort ? { sort: filters.sort } : {}),
  });

  const response = await apiRequest(
    `${ApiPaths.GET_EXPENSES()}?${params.toString()}`,
    "GET",
    undefined,
    false,
    requestOpts?.skipLoader ?? false
  );

  if (response?.success) {
    const { records, totalPages, totalItems } = parseExpensesResponse(response.data);
    return { response: true, expenses: records, totalPages, totalItems };
  }

  showLog(response?.message || "Failed to fetch expenses");
  return { response: false, expenses: [], totalPages: 0 };
};

export const fetchAllExpensesMatching = async (
  filters: ExpensesFilters,
  batchSize = 250,
  opts?: { skipLoader?: boolean }
): Promise<ExpenseModel[] | null> => {
  const first = await fetchExpenses(1, batchSize, filters, { skipLoader: opts?.skipLoader ?? true });
  if (!first.response) return null;

  let all = [...first.expenses];
  const totalPages = Math.max(1, first.totalPages || 1);

  for (let p = 2; p <= totalPages; p++) {
    // eslint-disable-next-line no-await-in-loop
    const next = await fetchExpenses(p, batchSize, filters, { skipLoader: opts?.skipLoader ?? true });
    if (!next.response) break;
    all = all.concat(next.expenses);
  }

  return all;
};

export const createOrUpdateExpense = async (
  payload: any,
  isEditable: boolean,
  id?: string
): Promise<boolean> => {
  const path = isEditable ? ApiPaths.UPDATE_EXPENSE(id!) : ApiPaths.CREATE_EXPENSE;
  const method = isEditable ? "PUT" : "POST";
  const response = await apiRequest(path, method, payload);
  return Boolean(response?.success);
};

