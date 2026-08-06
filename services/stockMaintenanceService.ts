import { api } from "./apiClient";
import type {
  StockMaintenance,
  CreateStockMaintenancePayload,
  StockMaintenanceListResponse,
} from "@/types/stockMaintenance";

export async function fetchStockMaintenance(
  inventoryItemId: string,
): Promise<StockMaintenanceListResponse> {
  return api.get<StockMaintenanceListResponse>(
    `/api/inventory/${inventoryItemId}/stock-maintenance`,
  );
}

export async function recordStockChange(
  inventoryItemId: string,
  payload: CreateStockMaintenancePayload,
): Promise<{ data: StockMaintenance }> {
  return api.post<{ data: StockMaintenance }>(
    `/api/inventory/${inventoryItemId}/stock-maintenance`,
    payload,
  );
}
