"use client";

import { withNetworkActivity } from "@/lib/swr-client";
import useSWR from "swr";

export type Channel = {
  channelId: number;
  channelName: string;
  conversations: number;
  leads: number;
};

export type InvoicingStatus = {
  paid: number;
  pending: number;
  overdue: number;
};

export type WarehouseEntry = {
  name: string;
  cbm: number;
};

export type RevenueTrend = {
  months: string[];
  values: number[];
};

export type RecentActivity = {
  id: string;
  title: string;
  status: string;
  date: string | null;
};

export type DashboardData = {
  // Aviontive
  totalConversations: number;
  totalLeads: number;
  channels: Channel[];
  // Supabase — counts
  totalInvoices: number;
  totalQuotations: number;
  // Supabase — finance
  turnover: number;
  gstCollected: number;
  netTurnover: number;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  // Breakdowns
  invoicingStatus: InvoicingStatus;
  warehouseSummary: WarehouseEntry[];
  revenueTrend: RevenueTrend;
  recentActivities: RecentActivity[];
};

type LeadsBySource = Record<string, number>;

type UseDashboardAnalyticsState = {
  dashboardData: DashboardData | null;
  leadsBySource: LeadsBySource | null;
  loading: boolean;
  error: string | null;
};

export type PeriodFilter = "Today" | "Yesterday" | "This Week" | "This Month" | "Custom";

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function periodToDateRange(
  period: PeriodFilter,
  customFrom?: string,
  customTo?: string,
): { from: string; to: string } {
  const now = new Date();
  switch (period) {
    case "Today": {
      const today = fmt(now);
      return { from: today, to: today };
    }
    case "Yesterday": {
      const yd = new Date(now);
      yd.setDate(now.getDate() - 1);
      const yesterday = fmt(yd);
      return { from: yesterday, to: yesterday };
    }
    case "This Week": {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      return { from: fmt(start), to: fmt(now) };
    }
    case "This Month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: fmt(start), to: fmt(now) };
    }
    case "Custom":
      return { from: customFrom || fmt(now), to: customTo || fmt(now) };
    default:
      return { from: fmt(now), to: fmt(now) };
  }
}

export function useDashboardAnalytics(
  period: PeriodFilter = "Today",
  customFrom?: string,
  customTo?: string,
) {
  const { from, to } = periodToDateRange(period, customFrom, customTo);
  const swrKey = `/swr/dashboard-analytics?from=${from}&to=${to}`;

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    swrKey,
    () =>
      withNetworkActivity(async () => {
        const [dashboardResponse, leadsResponse] = await Promise.all([
          fetch(`/api/analytics/dashboard/overview?from=${from}&to=${to}`),
          fetch("/api/leads/aviontive"),
        ]);

        if (!dashboardResponse.ok) {
          throw new Error(
            `Failed to fetch dashboard data: ${dashboardResponse.status}`,
          );
        }
        const dashboardRes = await dashboardResponse.json();

        let leadsBySource: LeadsBySource = {};
        if (leadsResponse.ok) {
          const leadsRes = await leadsResponse.json();
          leadsBySource = aggregateLeadsBySource(leadsRes.data || []);
        }

        return {
          dashboardData: dashboardRes.data as DashboardData,
          leadsBySource,
        } as UseDashboardAnalyticsState;
      }),
  );

  return {
    dashboardData: data?.dashboardData ?? null,
    leadsBySource: data?.leadsBySource ?? null,
    loading: isLoading || isValidating,
    error: error instanceof Error ? error.message : null,
    refetch: mutate,
  };
}

function aggregateLeadsBySource(leads: unknown[]): LeadsBySource {
  const aggregated: LeadsBySource = {
    WhatsApp: 0,
    "Phone Calls": 0,
    Email: 0,
    Website: 0,
    "Walk-in": 0,
    Instagram: 0,
    Facebook: 0,
  };
  (leads as Record<string, unknown>[]).forEach((lead) => {
    const channel = (lead.conversation as Record<string, unknown>)
      ?.channel_account as Record<string, unknown>;
    const name = String(
      (channel?.channel as Record<string, unknown>)?.name ?? "Website",
    );
    const normalizedChannel = normalizeChannel(name);
    if (normalizedChannel in aggregated) aggregated[normalizedChannel]++;
    else aggregated[normalizedChannel] = 1;
  });
  return aggregated;
}

function normalizeChannel(channel: string): string {
  const channelMap: Record<string, string> = {
    whatsapp: "WhatsApp",
    instagram: "Instagram",
    facebook: "Facebook",
    email: "Email",
    calls: "Phone Calls",
    phone: "Phone Calls",
    website: "Website",
    walkin: "Walk-in",
    "walk-in": "Walk-in",
    sms: "Email",
    telegram: "Website",
  };
  return channelMap[channel.toLowerCase()] || channel;
}
