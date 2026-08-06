import type { LoginResponse } from "@/types/auth";
import { api } from "./apiClient";

export type TenantMembership = {
  id: string;
  tenantId: string;
  role: "owner" | "admin" | "staff";
  createdAt: string;
  organizationName: string;
  planTier: string | null;
};

export async function fetchTenantMemberships(): Promise<{
  activeTenantId: string | null;
  data: TenantMembership[];
}> {
  return api.get<{ activeTenantId: string | null; data: TenantMembership[] }>(
    "/api/tenant/memberships",
  );
}

export async function switchTenant(tenantId: string): Promise<LoginResponse> {
  return api.post<LoginResponse>("/api/tenant/switch", { tenantId });
}

export async function inviteTenantMember(payload: {
  email: string;
  role: "admin" | "staff";
}) {
  return api.post<{ data: TenantMembership }>("/api/tenant/invite", payload);
}
