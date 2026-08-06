export type TransactionType = "Income" | "Expense" | "Commission";

export type TransactionStatus =
  | "Completed"
  | "Pending"
  | "Processing"
  | "Failed"
  | "Cancelled";

export type Transaction = {
  id: string;
  type: TransactionType;
  party: string; // company or individual name
  amount: number; // in rupees
  date: string; // ISO date string
  status: TransactionStatus;
  details: string;
  invoiceId?: string;
  category?: string;
  paymentMethod?: string;
  createdBy?: string;
};

export type CreateTransactionPayload = Omit<Transaction, "id">;
export type UpdateTransactionPayload = Partial<Omit<Transaction, "id">>;

export type TransactionListResponse = {
  data: Transaction[];
  total: number;
  page: number;
  pageSize: number;
  maxPages?: number;
};

export type TransactionFilters = {
  type?: TransactionType;
  status?: TransactionStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type FinanceSummary = {
  totalIncome: number;
  totalExpenses: number;
  totalCommissions: number;
  netBalance: number;
  period: string; // e.g. "2024-Q1"
};
