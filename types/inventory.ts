export type InventoryStatus =
  | "In Stock"
  | "Out for Delivery"
  | "Processing"
  | "Reserved"
  | "Out of Stock";

export type InventoryItem = {
  id: string;
  clientId?: string; // UUID
  client?: string; // client name - for display
  commodity: string;
  description?: string;
  cbm: number; // cubic metres
  quantity: number;
  unit?: string;
  packing: string;
  warehouseId: string; // UUID - now required FK
  warehouse?: string; // warehouse name - for display
  warehouseLocation?: string; // city / country
  staffId?: string; // UUID
  staff?: string; // staff name - for display
  status: InventoryStatus;
  receivedDate?: string; // ISO date string
  expectedDelivery?: string; // ISO date string
  notes?: string;
  createdAt?: string; // ISO date string
  updatedAt?: string; // ISO date string
};

export type CreateInventoryPayload = Omit<
  InventoryItem,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateInventoryPayload = Partial<
  Omit<InventoryItem, "id" | "createdAt" | "updatedAt">
>;

export type InventoryListResponse = {
  data: InventoryItem[];
  total: number;
  page: number;
  pageSize: number;
  maxPages?: number;
};

export type InventoryFilters = {
  status?: InventoryStatus;
  warehouseId?: string;
  clientId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type StockUploadRow = {
  clientId: string; // UUID
  commodity: string;
  cbm: number;
  quantity: number;
  packing: string;
  warehouseId: string; // UUID
};

export type StockUploadPayload = {
  rows: StockUploadRow[];
  uploadedBy: string;
  uploadedAt: string; // ISO date string
};

export type StockUploadResponse = {
  inserted: number;
  failed: number;
  errors?: Array<{ row: number; reason: string }>;
};
