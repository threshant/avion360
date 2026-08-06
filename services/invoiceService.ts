import { api } from "./apiClient";
import type {
  Invoice,
  CreateInvoicePayload,
  UpdateInvoicePayload,
  InvoiceListResponse,
  InvoiceFilters,
  Quotation,
  CreateQuotationPayload,
  UpdateQuotationPayload,
  QuotationListResponse,
  QuotationFilters,
} from "@/types/invoice";

const INVOICE_ENDPOINT = "/api/invoices";
const QUOTATION_ENDPOINT = "/api/quotations";

function toQueryString(
  filters: InvoiceFilters | QuotationFilters
): string {
  const params = new URLSearchParams();
  (Object.entries(filters) as [string, string | number | undefined][]).forEach(
    ([key, value]) => {
      if (value !== undefined) params.set(key, String(value));
    }
  );
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

// ── Invoices ──────────────────────────────────────────────────────────────────

export async function fetchInvoices(
  filters: InvoiceFilters = {}
): Promise<InvoiceListResponse> {
  return api.get<InvoiceListResponse>(
    `${INVOICE_ENDPOINT}${toQueryString(filters)}`
  );
}

export async function fetchInvoiceById(id: string): Promise<Invoice> {
  return api.get<Invoice>(`${INVOICE_ENDPOINT}/${id}`);
}

export async function createInvoice(
  payload: CreateInvoicePayload
): Promise<Invoice> {
  return api.post<Invoice>(INVOICE_ENDPOINT, payload);
}

export async function updateInvoice(
  id: string,
  payload: UpdateInvoicePayload
): Promise<Invoice> {
  return api.patch<Invoice>(`${INVOICE_ENDPOINT}/${id}`, payload);
}

const PROFORMA_ENDPOINT = "/api/proforma-invoices";

export async function deleteInvoice(id: string): Promise<void> {
  return api.delete<void>(`${INVOICE_ENDPOINT}/${id}`);
}

// ── Quotations ────────────────────────────────────────────────────────────────

export async function fetchQuotations(
  filters: QuotationFilters = {}
): Promise<QuotationListResponse> {
  return api.get<QuotationListResponse>(
    `${QUOTATION_ENDPOINT}${toQueryString(filters)}`
  );
}

export async function fetchQuotationById(id: string): Promise<Quotation> {
  return api.get<Quotation>(`${QUOTATION_ENDPOINT}/${id}`);
}

export async function createQuotation(
  payload: CreateQuotationPayload
): Promise<Quotation> {
  return api.post<Quotation>(QUOTATION_ENDPOINT, payload);
}

export async function updateQuotation(
  id: string,
  payload: UpdateQuotationPayload
): Promise<Quotation> {
  return api.patch<Quotation>(`${QUOTATION_ENDPOINT}/${id}`, payload);
}

export async function deleteQuotation(id: string): Promise<void> {
  return api.delete<void>(`${QUOTATION_ENDPOINT}/${id}`);
}

export async function deleteProformaInvoice(id: string): Promise<void> {
  return api.delete<void>(`${PROFORMA_ENDPOINT}/${id}`);
}

export async function convertQuotationToInvoice(
  quotationId: string
): Promise<Invoice> {
  return api.post<Invoice>(
    `${QUOTATION_ENDPOINT}/${quotationId}/convert`,
    {}
  );
}
