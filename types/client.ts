import type { InvoiceStatus, ProformaStatus, QuotationStatus } from "./invoice";

export type BusinessType =
  | "Manufacturer"
  | "Distributor"
  | "Retailer"
  | "Trader"
  | "Other";

export type Client = {
  id: string; // UUID
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  gstNumber?: string;
  businessType?: BusinessType;
  gstRate?: number;
  gstAvailable?: boolean;
  createdAt: string; // ISO date string
  updatedAt?: string; // ISO date string
};

export type CreateClientPayload = Omit<
  Client,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateClientPayload = Partial<
  Omit<Client, "id" | "createdAt" | "updatedAt">
>;

export type ClientListResponse = {
  data: Client[];
  total: number;
  page?: number;
  pageSize?: number;
  maxPages?: number;
};

export type ClientProfileInvoice = {
  id: string;
  date: string;
  dueDate?: string;
  status: InvoiceStatus;
  totalAmount: number;
  paidAmount?: number;
  remaining?: number;
};

export type ClientProfileQuotation = {
  id: string;
  quotationNumber?: string;
  date: string;
  validUntil: string;
  status: QuotationStatus;
  totalAmount: number;
};

export type ClientProfileProforma = {
  id: string;
  date: string;
  validUntil?: string;
  status: ProformaStatus;
  totalAmount: number;
};

export type ClientProfilePayment = {
  id: string;
  referenceId?: string;
  source: "invoice" | "on_account";
  date: string;
  amount: number;
  mode?: string;
  reference?: string;
  status: "Paid" | "Completed" | "Reversed";
};

export type ClientProfileOverview = {
  invoiceCount: number;
  quotationCount: number;
  proformaCount: number;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  creditBalance?: number;
  lastActivityAt?: string;
};

export type ClientProfile = {
  client: Client;
  overview: ClientProfileOverview;
  invoices: ClientProfileInvoice[];
  quotations: ClientProfileQuotation[];
  proformas: ClientProfileProforma[];
  payments: ClientProfilePayment[];
};

export type ClientProfileResponse = {
  data: ClientProfile;
};
