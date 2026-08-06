import { api } from "./apiClient";
import type {
  Transaction,
  CreateTransactionPayload,
  UpdateTransactionPayload,
  TransactionListResponse,
  TransactionFilters,
  FinanceSummary,
} from "@/types/finance";

const ENDPOINT = "/api/finance/transactions";

function toQueryString(filters: TransactionFilters): string {
  const params = new URLSearchParams();
  (Object.entries(filters) as [string, string | number | undefined][]).forEach(
    ([key, value]) => {
      if (value !== undefined) params.set(key, String(value));
    }
  );
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchTransactions(
  filters: TransactionFilters = {}
): Promise<TransactionListResponse> {
  return api.get<TransactionListResponse>(`${ENDPOINT}${toQueryString(filters)}`);
}

export async function fetchTransactionById(id: string): Promise<Transaction> {
  return api.get<Transaction>(`${ENDPOINT}/${id}`);
}

export async function fetchFinanceSummary(period: string): Promise<FinanceSummary> {
  return api.get<FinanceSummary>(`/api/finance/summary?period=${period}`);
}

export async function createTransaction(
  payload: CreateTransactionPayload
): Promise<Transaction> {
  return api.post<Transaction>(ENDPOINT, payload);
}

export async function updateTransaction(
  id: string,
  payload: UpdateTransactionPayload
): Promise<Transaction> {
  return api.patch<Transaction>(`${ENDPOINT}/${id}`, payload);
}

export async function deleteTransaction(id: string): Promise<void> {
  return api.delete<void>(`${ENDPOINT}/${id}`);
}
