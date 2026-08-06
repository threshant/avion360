export type CustomerStatus = "Active" | "Inactive" | "Prospect" | "Churned";

export type Customer = {
  id: number;
  name: string;
  company: string;
  phone: string;
  email: string;
  country: string;
  city: string;
  status: CustomerStatus;
  totalDeals: number;
  totalRevenue: number; // in rupees
  assignedTo: string;
  createdAt: string; // ISO date string
  lastActivity: string; // ISO date string
  tags: string[];
};

export type CreateCustomerPayload = Omit<Customer, "id" | "createdAt">;
export type UpdateCustomerPayload = Partial<Omit<Customer, "id" | "createdAt">>;

export type CustomerListResponse = {
  data: Customer[];
  total: number;
  page: number;
  pageSize: number;
};

export type CustomerFilters = {
  status?: CustomerStatus;
  assignedTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};
