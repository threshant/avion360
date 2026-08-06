import type { InvoiceStatus } from "./invoice";

export type PaymentMode =
  | "Cash"
  | "Bank Transfer"
  | "UPI"
  | "Cheque"
  | "Other";

export type PaymentStatus = "Completed" | "Reversed";

export type Payment = {
  id: string;
  clientId: string;
  invoiceId?: string; // undefined/null = on-account (advance) payment
  amount: number;
  paymentDate: string; // ISO date string
  mode: PaymentMode;
  reference?: string;
  notes?: string;
  status: PaymentStatus;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
  // joined/derived fields
  clientName?: string;
  invoiceTotalAmount?: number;
  invoicePaidAmount?: number;
  invoiceRemaining?: number;
};

export type CreatePaymentPayload = {
  clientId: string;
  invoiceId?: string;
  amount: number;
  paymentDate?: string;
  mode?: PaymentMode;
  reference?: string;
  notes?: string;
  createdBy?: string;
};

export type PaymentFilters = {
  clientId?: string;
  invoiceId?: string;
  mode?: PaymentMode;
  status?: PaymentStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type PaymentListResponse = {
  data: Payment[];
  total: number;
  page: number;
  pageSize: number;
};

export type ClientBalanceInvoice = {
  id: string;
  totalAmount: number;
  paidAmount: number;
  remaining: number;
  status: InvoiceStatus;
};

export type ClientBalance = {
  clientId: string;
  clientName: string;
  // sum of active (non-cancelled) invoice totals
  totalInvoiced: number;
  // completed payments allocated against invoices
  invoiceCollected: number;
  // completed on-account / advance payments (unallocated credit)
  creditBalance: number;
  // invoiceCollected + creditBalance (all cash received)
  totalCollected: number;
  // totalInvoiced - invoiceCollected (never negative)
  totalOutstanding: number;
  activeInvoiceCount: number;
  paidInvoiceCount: number;
  partiallyPaidInvoiceCount: number;
  unpaidInvoiceCount: number;
  invoices: ClientBalanceInvoice[];
};

export type ClientBalanceResponse = {
  data: ClientBalance;
};
