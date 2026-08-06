export type ReportCategory =
  | "Sales"
  | "Leads"
  | "Calls"
  | "Finance"
  | "Inventory"
  | "HR";

export type ReportPeriod =
  | "today"
  | "this_week"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "this_year"
  | "custom";

export type Report = {
  id: number;
  title: string;
  category: ReportCategory;
  generatedAt: string; // ISO date string
  generatedBy: string;
  period: string;
  downloadUrl?: string;
};

export type ReportFilters = {
  category?: ReportCategory;
  period?: ReportPeriod;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};

export type ReportListResponse = {
  data: Report[];
  total: number;
};

export type GenerateReportPayload = {
  title: string;
  category: ReportCategory;
  period: ReportPeriod;
  dateFrom?: string;
  dateTo?: string;
  filters?: Record<string, unknown>;
};
