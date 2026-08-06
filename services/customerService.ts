import { api } from "./apiClient";
import type {
  Customer,
  CreateCustomerPayload,
  UpdateCustomerPayload,
  CustomerListResponse,
  CustomerFilters,
} from "@/types/customer";

const ENDPOINT = "/api/customers";

function toQueryString(filters: CustomerFilters): string {
  const params = new URLSearchParams();
  (Object.entries(filters) as [string, string | number | undefined][]).forEach(
    ([key, value]) => {
      if (value !== undefined) params.set(key, String(value));
    }
  );
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchCustomers(
  filters: CustomerFilters = {}
): Promise<CustomerListResponse> {
  return api.get<CustomerListResponse>(`${ENDPOINT}${toQueryString(filters)}`);
}

export async function fetchCustomerById(id: number): Promise<Customer> {
  return api.get<Customer>(`${ENDPOINT}/${id}`);
}

export async function createCustomer(
  payload: CreateCustomerPayload
): Promise<Customer> {
  return api.post<Customer>(ENDPOINT, payload);
}

export async function updateCustomer(
  id: number,
  payload: UpdateCustomerPayload
): Promise<Customer> {
  return api.patch<Customer>(`${ENDPOINT}/${id}`, payload);
}

export async function deleteCustomer(id: number): Promise<void> {
  return api.delete<void>(`${ENDPOINT}/${id}`);
}
