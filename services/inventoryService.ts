import { api } from "./apiClient";
import type {
  InventoryItem,
  CreateInventoryPayload,
  UpdateInventoryPayload,
  InventoryListResponse,
  InventoryFilters,
  StockUploadPayload,
  StockUploadResponse,
} from "@/types/inventory";

const ENDPOINT = "/api/inventory";

function toQueryString(filters: InventoryFilters): string {
  const params = new URLSearchParams();
  (Object.entries(filters) as [string, string | number | undefined][]).forEach(
    ([key, value]) => {
      if (value !== undefined) params.set(key, String(value));
    },
  );
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchInventory(
  filters: InventoryFilters = {},
): Promise<InventoryListResponse> {
  return api.get<InventoryListResponse>(`${ENDPOINT}${toQueryString(filters)}`);
}

export async function fetchInventoryById(
  id: string,
): Promise<{ data: InventoryItem }> {
  return api.get<{ data: InventoryItem }>(`${ENDPOINT}/${id}`);
}

export async function createInventoryItem(
  payload: CreateInventoryPayload,
): Promise<{ data: InventoryItem }> {
  return api.post<{ data: InventoryItem }>(ENDPOINT, payload);
}

export async function updateInventoryItem(
  id: string,
  payload: UpdateInventoryPayload,
): Promise<{ data: InventoryItem }> {
  return api.patch<{ data: InventoryItem }>(`${ENDPOINT}/${id}`, payload);
}

export async function deleteInventoryItem(id: string): Promise<void> {
  return api.delete<void>(`${ENDPOINT}/${id}`);
}

export async function bulkUploadStock(
  payload: StockUploadPayload,
): Promise<StockUploadResponse> {
  return api.post<StockUploadResponse>(`${ENDPOINT}/bulk-upload`, payload);
}
