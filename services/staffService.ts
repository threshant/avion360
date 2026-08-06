import { api } from "./apiClient";
import type { Staff } from "@/types/warehouse";

const ENDPOINT = "/api/staff";

export interface StaffListResponse {
  data: Staff[];
  total: number;
}

export async function fetchStaff(
  opts: { warehouseId?: string; page?: number; pageSize?: number } = {},
): Promise<StaffListResponse> {
  const params = new URLSearchParams();
  if (opts.warehouseId) params.set("warehouseId", String(opts.warehouseId));
  if (opts.page) params.set("page", String(opts.page));
  if (opts.pageSize) params.set("pageSize", String(opts.pageSize));
  const qs = params.toString() ? `?${params.toString()}` : "";
  return api.get<StaffListResponse>(`${ENDPOINT}${qs}`);
}

export async function fetchStaffById(id: string): Promise<{ data: Staff }> {
  return api.get<{ data: Staff }>(`${ENDPOINT}/${id}`);
}
