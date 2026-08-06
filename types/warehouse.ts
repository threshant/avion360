export type Warehouse = {
  id: string; // UUID
  name: string;
  location?: string;
  createdAt: string; // ISO date string
  updatedAt?: string; // ISO date string
};

export type CreateWarehousePayload = Omit<
  Warehouse,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateWarehousePayload = Partial<
  Omit<Warehouse, "id" | "createdAt" | "updatedAt">
>;

export type Staff = {
  id: string; // UUID
  name: string;
  warehouseId?: string; // UUID
  createdAt: string; // ISO date string
  updatedAt?: string; // ISO date string
};

export type CreateStaffPayload = Omit<Staff, "id" | "createdAt" | "updatedAt">;
export type UpdateStaffPayload = Partial<
  Omit<Staff, "id" | "createdAt" | "updatedAt">
>;

export type WarehouseListResponse = {
  data: Warehouse[];
  total: number;
};

export type StaffListResponse = {
  data: Staff[];
  total: number;
};
