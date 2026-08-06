export type InvoiceStatus =
  | "Paid"
  | "Partially Paid"
  | "Pending"
  | "Draft"
  | "Sent"
  | "Overdue"
  | "Cancelled";

export type QuotationStatus =
  | "Pending"
  | "Accepted"
  | "Draft"
  | "Rejected"
  | "Expired";

export type InvoiceItem = {
  product?: string;
  description: string;
  hsnCode?: string;
  quantity: number;
  unitPrice: number; // in rupees
  amount: number; // quantity × unitPrice
  imageBase64?: string;
};

export type Invoice = {
  id: string;
  customerId?: string;
  client?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientAddress?: string;
  clientGST?: string;
  shippingAddress?: string;
  items: InvoiceItem[];
  subtotal: number; // in rupees
  gstRate: number; // percentage e.g. 18
  gstAmount: number; // in rupees
  discountPercentage: number;
  discountAmount: number;
  tdsRate: number;
  tdsAmount: number;
  tcsRate: number;
  tcsAmount: number;
  totalAmount: number; // in rupees
  paidAmount?: number; // cumulative amount collected (payments module)
  remaining?: number; // totalAmount - paidAmount
  date: string; // ISO date string
  dueDate?: string; // ISO date string (optional)
  status: InvoiceStatus;
  notes?: string;
  currency?: string; // e.g. 'INR', 'USD'
  taxType?: "CGST_SGST" | "IGST";
  signatoryName?: string;
  createdBy?: string;
};

export type CreateInvoicePayload = Omit<
  Invoice,
  "id" | "subtotal" | "gstAmount"
>;
export type UpdateInvoicePayload = Partial<Omit<Invoice, "id">>;

export type Quotation = {
  id: string;
  quotationNumber?: string;
  customerId?: string;
  client: string;
  clientPhone?: string;
  clientEmail?: string;
  clientAddress?: string;
  clientGST?: string;
  shippingAddress?: string;
  items: InvoiceItem[];
  subtotal: number; // in rupees
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  date: string; // ISO date string
  validUntil: string; // ISO date string
  status: QuotationStatus;
  notes?: string;
  createdBy?: string;
};

export type CreateQuotationPayload = {
  clientId: string;
  items: InvoiceItem[];
  subtotal?: number;
  gstRate: number;
  gstAmount?: number;
  totalAmount?: number;
  date: string;
  validUntil: string;
  status?: QuotationStatus;
  notes?: string;
  shippingAddress?: string;
  createdBy?: string;
};
export type UpdateQuotationPayload = Partial<Omit<Quotation, "id">>;

export type ProformaStatus =
  | "Draft"
  | "Sent"
  | "Accepted"
  | "Rejected"
  | "Expired"
  | "Converted";

export type ProformaInvoice = {
  id: string;
  customerId?: string;
  client?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientAddress?: string;
  shippingAddress?: string;
  clientGST?: string;
  items: InvoiceItem[];
  subtotal: number;
  gstRate: number;
  gstAmount: number;
  discountPercentage: number;
  discountAmount: number;
  tdsRate: number;
  tdsAmount: number;
  tcsRate: number;
  tcsAmount: number;
  totalAmount: number;
  date: string;
  dueDate?: string;
  validUntil?: string;
  status: ProformaStatus;
  notes?: string;
  quotationId?: string;
  createdBy?: string;
};

export type ProformaListResponse = {
  data: ProformaInvoice[];
  total: number;
  page: number;
  pageSize: number;
};

export type InvoiceListResponse = {
  data: Invoice[];
  total: number;
  page: number;
  pageSize: number;
};

export type QuotationListResponse = {
  data: Quotation[];
  total: number;
  page: number;
  pageSize: number;
};

export type InvoiceFilters = {
  status?: InvoiceStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  clientId?: string;
  page?: number;
  pageSize?: number;
};

export type QuotationFilters = {
  status?: QuotationStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};
