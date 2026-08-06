import { api } from "./apiClient";
import type {
  PayrollRecord,
  UpdatePayrollPayload,
  PayrollListResponse,
  PayrollFilters,
  PayrollSummary,
} from "@/types/payroll";

const ENDPOINT = "/api/payroll";

function toQueryString(filters: PayrollFilters): string {
  const params = new URLSearchParams();
  (Object.entries(filters) as [string, string | number | undefined][]).forEach(
    ([key, value]) => {
      if (value !== undefined) params.set(key, String(value));
    }
  );
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchPayroll(
  filters: PayrollFilters = {}
): Promise<PayrollListResponse> {
  return api.get<PayrollListResponse>(`${ENDPOINT}${toQueryString(filters)}`);
}

export async function fetchPayrollById(id: string): Promise<PayrollRecord> {
  return api.get<PayrollRecord>(`${ENDPOINT}/${id}`);
}

export async function fetchPayrollSummary(month: string): Promise<PayrollSummary> {
  return api.get<PayrollSummary>(`${ENDPOINT}/summary?month=${month}`);
}

export async function updatePayrollRecord(
  id: string,
  payload: UpdatePayrollPayload
): Promise<PayrollRecord> {
  return api.patch<PayrollRecord>(`${ENDPOINT}/${id}`, payload);
}

export async function processPayroll(month: string): Promise<{ processed: number }> {
  // Triggers bulk salary processing for the given month.
  return api.post<{ processed: number }>(`${ENDPOINT}/process`, { month });
}
