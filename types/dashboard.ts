export type LeadSourceKey =
  | "WhatsApp"
  | "Calls"
  | "Email"
  | "Website"
  | "Walk-in"
  | "Instagram"
  | "Facebook";

export type DashboardKpis = {
  totalLeads: number;
  totalCalls: number;
  quotations: number;
  invoices: number;
  turnover: number; // in rupees
  gstCollected: number; // in rupees
  income: number; // in rupees
  expenses: number; // in rupees
};

export type LeadSourceStat = {
  source: LeadSourceKey;
  count: number;
  growth: number; // percentage — positive = up, negative = down
};

export type ActivityType =
  | "lead"
  | "call"
  | "deal"
  | "task"
  | "invoice"
  | "note";

export type ActivityFeedItem = {
  id: number;
  type: ActivityType;
  description: string;
  user: string;
  timestamp: string; // ISO date string
  entityId?: number | string;
};

export type DashboardData = {
  kpis: DashboardKpis;
  leadSources: LeadSourceStat[];
  activityFeed: ActivityFeedItem[];
  period: string; // e.g. "2024-Q1"
};
