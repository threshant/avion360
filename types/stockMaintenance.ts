export type StockMaintenance = {
  id: string; // UUID
  inventoryItemId: string;
  previousQuantity: number;
  newQuantity: number;
  changeReason: string;
  changedBy?: string;
  createdAt: string; // ISO date string
};

export type CreateStockMaintenancePayload = Omit<
  StockMaintenance,
  "id" | "createdAt"
>;

export type StockMaintenanceListResponse = {
  data: StockMaintenance[];
  total: number;
};
