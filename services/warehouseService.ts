import { api } from "./apiClient";
import type {
  Warehouse,
  Staff,
  CreateWarehousePayload,
  UpdateWarehousePayload,
  CreateStaffPayload,
  UpdateStaffPayload,
  WarehouseListResponse,
  StaffListResponse,
} from "@/types/warehouse";

const WAREHOUSE_ENDPOINT = "/api/warehouses";
const STAFF_ENDPOINT = "/api/staff";

// ── Warehouse Services ───────────────────────────────────────────────

export async function fetchWarehouses(
  search?: string,
): Promise<WarehouseListResponse> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  return api.get<WarehouseListResponse>(`${WAREHOUSE_ENDPOINT}${qs}`);
}

export async function fetchWarehouseById(
  id: string,
): Promise<{ data: Warehouse }> {
  return api.get<{ data: Warehouse }>(`${WAREHOUSE_ENDPOINT}/${id}`);
}

export async function createWarehouse(
  payload: CreateWarehousePayload,
): Promise<{ data: Warehouse }> {
  return api.post<{ data: Warehouse }>(WAREHOUSE_ENDPOINT, payload);
}

export async function updateWarehouse(
  id: string,
  payload: UpdateWarehousePayload,
): Promise<{ data: Warehouse }> {
  return api.patch<{ data: Warehouse }>(`${WAREHOUSE_ENDPOINT}/${id}`, payload);
}

export async function deleteWarehouse(id: string): Promise<void> {
  return api.delete<void>(`${WAREHOUSE_ENDPOINT}/${id}`);
}

// ── Staff Services ───────────────────────────────────────────────────

export async function fetchStaff(
  searchOrOpts?:
    | string
    | {
        search?: string;
        warehouseId?: string;
        page?: number;
        pageSize?: number;
      },
): Promise<StaffListResponse> {
  const opts =
    typeof searchOrOpts === "string"
      ? { search: searchOrOpts }
      : searchOrOpts || {};
  const params = new URLSearchParams();
  if (opts.search) params.set("search", String(opts.search));
  if (opts.warehouseId) params.set("warehouseId", String(opts.warehouseId));
  if (opts.page) params.set("page", String(opts.page));
  if (opts.pageSize) params.set("pageSize", String(opts.pageSize));
  const qs = params.toString() ? `?${params.toString()}` : "";
  return api.get<StaffListResponse>(`${STAFF_ENDPOINT}${qs}`);
}

export async function fetchStaffById(id: string): Promise<{ data: Staff }> {
  return api.get<{ data: Staff }>(`${STAFF_ENDPOINT}/${id}`);
}

export async function createStaff(
  payload: CreateStaffPayload,
): Promise<{ data: Staff }> {
  return api.post<{ data: Staff }>(STAFF_ENDPOINT, payload);
}

export async function updateStaff(
  id: string,
  payload: UpdateStaffPayload,
): Promise<{ data: Staff }> {
  return api.patch<{ data: Staff }>(`${STAFF_ENDPOINT}/${id}`, payload);
}

export async function deleteStaff(id: string): Promise<void> {
  return api.delete<void>(`${STAFF_ENDPOINT}/${id}`);
}
