import { api } from "./apiClient";
import type {
  Expense,
  CreateExpensePayload,
  UpdateExpensePayload,
  ExpenseListResponse,
  ExpenseFilters,
} from "@/types/expense";

const ENDPOINT = "/api/expenses";

function toQueryString(filters: ExpenseFilters): string {
  const params = new URLSearchParams();
  (Object.entries(filters) as [string, string | number | undefined][]).forEach(
    ([key, value]) => {
      if (value !== undefined) params.set(key, String(value));
    },
  );
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchExpenses(
  filters: ExpenseFilters = {},
): Promise<ExpenseListResponse> {
  return api.get<ExpenseListResponse>(`${ENDPOINT}${toQueryString(filters)}`);
}

export async function fetchExpenseById(id: string): Promise<Expense> {
  return api.get<Expense>(`${ENDPOINT}/${id}`);
}

export async function createExpense(
  payload: CreateExpensePayload,
): Promise<Expense> {
  return api.post<Expense>(ENDPOINT, payload);
}

export async function updateExpense(
  id: string,
  payload: UpdateExpensePayload,
): Promise<Expense> {
  return api.patch<Expense>(`${ENDPOINT}/${id}`, payload);
}

export async function deleteExpense(id: string): Promise<void> {
  return api.delete<void>(`${ENDPOINT}/${id}`);
}
