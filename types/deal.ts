export type DealStage =
  | "Prospecting"
  | "Qualification"
  | "Proposal"
  | "Negotiation"
  | "Closed Won"
  | "Closed Lost";

export type Deal = {
  id: number;
  title: string;
  customerId: number;
  customerName: string;
  value: number; // in rupees
  stage: DealStage;
  probability: number; // 0–100
  expectedCloseDate: string; // ISO date string
  assignedTo: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  notes: string;
  tags: string[];
};

export type CreateDealPayload = Omit<Deal, "id" | "createdAt" | "updatedAt">;
export type UpdateDealPayload = Partial<Omit<Deal, "id" | "createdAt" | "updatedAt">>;

export type DealListResponse = {
  data: Deal[];
  total: number;
  page: number;
  pageSize: number;
};

export type DealFilters = {
  stage?: DealStage;
  assignedTo?: string;
  customerId?: number;
  search?: string;
  page?: number;
  pageSize?: number;
};
