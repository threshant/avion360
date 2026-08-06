export type ExpenseCategory =
  | "Rent & Utilities"
  | "Office Supplies"
  | "Equipment"
  | "Salaries"
  | "Travel"
  | "Marketing"
  | "Software & Subscriptions"
  | "Legal & Professional"
  | "Other";

export type ExpensePaymentMode =
  | "Cash"
  | "Bank Transfer"
  | "UPI"
  | "Cheque"
  | "Other";

export type ExpenseStatus = "Completed" | "Reversed";

export type Expense = {
  id: string;
  category: ExpenseCategory;
  party: string; // vendor / paid to
  amount: number;
  expenseDate: string; // ISO date string
  paymentMode: ExpensePaymentMode;
  reference?: string;
  description?: string;
  status: ExpenseStatus;
  transactionId?: string; // linked finance transaction id (EXP-...)
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
};

export type CreateExpensePayload = {
  category: ExpenseCategory;
  party: string;
  amount: number;
  expenseDate?: string;
  paymentMode?: ExpensePaymentMode;
  reference?: string;
  description?: string;
};

export type UpdateExpensePayload = Partial<CreateExpensePayload>;

export type ExpenseFilters = {
  category?: ExpenseCategory;
  paymentMode?: ExpensePaymentMode;
  status?: ExpenseStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type ExpenseListResponse = {
  data: Expense[];
  total: number;
  page: number;
  pageSize: number;
};
