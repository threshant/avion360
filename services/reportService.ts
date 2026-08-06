import { api } from "./apiClient";
import type {
  Report,
  ReportListResponse,
  ReportFilters,
  GenerateReportPayload,
} from "@/types/report";

const ENDPOINT = "/api/reports/list";

function toQueryString(filters: ReportFilters): string {
  const params = new URLSearchParams();
  (Object.entries(filters) as [string, string | number | undefined][]).forEach(
    ([key, value]) => {
      if (value !== undefined) params.set(key, String(value));
    },
  );
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchReports(
  filters: ReportFilters = {},
): Promise<ReportListResponse> {
  return api.get<ReportListResponse>(`${ENDPOINT}${toQueryString(filters)}`);
}

export async function fetchReportById(id: number): Promise<Report> {
  return api.get<Report>(`${ENDPOINT}/${id}`);
}

export async function generateReport(
  payload: GenerateReportPayload,
): Promise<Report> {
  return api.post<Report>(`${ENDPOINT}/generate`, payload);
}

export async function deleteReport(id: number): Promise<void> {
  return api.delete<void>(`${ENDPOINT}/${id}`);
}
