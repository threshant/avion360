import { api } from "./apiClient";
import type {
  Deal,
  CreateDealPayload,
  UpdateDealPayload,
  DealListResponse,
  DealFilters,
} from "@/types/deal";

const ENDPOINT = "/api/deals";

function toQueryString(filters: DealFilters): string {
  const params = new URLSearchParams();
  (Object.entries(filters) as [string, string | number | undefined][]).forEach(
    ([key, value]) => {
      if (value !== undefined) params.set(key, String(value));
    }
  );
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchDeals(
  filters: DealFilters = {}
): Promise<DealListResponse> {
  return api.get<DealListResponse>(`${ENDPOINT}${toQueryString(filters)}`);
}

export async function fetchDealById(id: number): Promise<Deal> {
  return api.get<Deal>(`${ENDPOINT}/${id}`);
}

export async function createDeal(payload: CreateDealPayload): Promise<Deal> {
  return api.post<Deal>(ENDPOINT, payload);
}

export async function updateDeal(
  id: number,
  payload: UpdateDealPayload
): Promise<Deal> {
  return api.patch<Deal>(`${ENDPOINT}/${id}`, payload);
}

export async function deleteDeal(id: number): Promise<void> {
  return api.delete<void>(`${ENDPOINT}/${id}`);
}
