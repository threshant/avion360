import { api } from "./apiClient";
import type { DashboardData, DashboardKpis, ActivityFeedItem } from "@/types/dashboard";

const ENDPOINT = "/api/dashboard";

export async function fetchDashboardData(): Promise<DashboardData> {
  return api.get<DashboardData>(ENDPOINT);
}

export async function fetchDashboardKpis(): Promise<DashboardKpis> {
  return api.get<DashboardKpis>(`${ENDPOINT}/kpis`);
}

export async function fetchActivityFeed(limit = 20): Promise<ActivityFeedItem[]> {
  return api.get<ActivityFeedItem[]>(`${ENDPOINT}/activity?limit=${limit}`);
}
