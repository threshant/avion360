import { api } from "./apiClient";
import type {
  Payment,
  CreatePaymentPayload,
  PaymentListResponse,
  PaymentFilters,
  ClientBalanceResponse,
} from "@/types/payment";

const ENDPOINT = "/api/payments";

function toQueryString(filters: PaymentFilters): string {
  const params = new URLSearchParams();
  (Object.entries(filters) as [string, string | number | undefined][]).forEach(
    ([key, value]) => {
      if (value !== undefined) params.set(key, String(value));
    },
  );
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchPayments(
  filters: PaymentFilters = {},
): Promise<PaymentListResponse> {
  return api.get<PaymentListResponse>(`${ENDPOINT}${toQueryString(filters)}`);
}

export async function fetchPaymentById(id: string): Promise<Payment> {
  return api.get<Payment>(`${ENDPOINT}/${id}`);
}

export async function createPayment(
  payload: CreatePaymentPayload,
): Promise<Payment> {
  return api.post<Payment>(ENDPOINT, payload);
}

export async function fetchClientPayments(
  clientId: string,
  filters: PaymentFilters = {},
): Promise<PaymentListResponse> {
  return api.get<PaymentListResponse>(
    `/api/clients/${clientId}/payments${toQueryString(filters)}`,
  );
}

export async function fetchClientBalance(
  clientId: string,
): Promise<ClientBalanceResponse> {
  return api.get<ClientBalanceResponse>(`/api/clients/${clientId}/balance`);
}

export async function fetchInvoicePayments(
  invoiceId: string,
): Promise<{ data: Payment[]; summary: { totalAmount: number; paidAmount: number; remaining: number } }> {
  return api.get<{
    data: Payment[];
    summary: { totalAmount: number; paidAmount: number; remaining: number };
  }>(`/api/invoices/${invoiceId}/payments`);
}
