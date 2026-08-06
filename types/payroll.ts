export type PaymentStatus = "Paid" | "Pending" | "Processing" | "On Hold";
export type PaymentMethod = "Bank Transfer" | "Cheque" | "Cash";

export type PayrollRecord = {
  id: string;
  employeeId: string;
  employeeCode: string | null;
  name: string;
  department: string;
  designation: string;
  dateOfBirth: string | null;
  joiningDate: string | null;
  workingDays: number;
  month: string; // "YYYY-MM"
  // CTC
  baseSalary: number;
  // Earnings breakdown
  basicSalary: number;  // 60% of CTC
  hra: number;          // 40% of CTC
  otherAllowances: number;
  overtime: number;
  bonus: number;
  totalEarnings: number;
  // Deductions breakdown
  professionalTax: number;
  lopDays: number;
  lopDeduction: number;
  otherDeductions: number;
  deductions: number;
  totalDeductions: number;
  // Net
  netSalary: number;
  paymentStatus: PaymentStatus;
  paidAt: string | null;
  paymentMethod?: PaymentMethod;
  remarks?: string;
};

export type UpdatePayrollPayload = Partial<
  Pick<PayrollRecord, "paymentStatus" | "paidAt" | "paymentMethod" | "remarks">
>;

export type PayrollListResponse = {
  data: PayrollRecord[];
  total: number;
  page: number;
  pageSize: number;
};

export type PayrollFilters = {
  month?: string;
  department?: string;
  paymentStatus?: PaymentStatus;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type PayrollSummary = {
  month: string;
  totalEmployees: number;
  totalPayable: number;
  totalPaid: number;
  totalPending: number;
};
