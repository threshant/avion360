import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import type { Client } from "@/types/client";
import { NextRequest } from "next/server";

function toClient(row: Record<string, unknown>): Client {
  return {
    id: row.id as string,
    name: row.name as string,
    email: (row.email as string) ?? undefined,
    phone: (row.phone as string) ?? undefined,
    company: (row.company as string) ?? undefined,
    address: (row.address as string) ?? undefined,
    gstNumber: (row.gst_number as string) ?? undefined,
    businessType: (row.business_type as Client["businessType"]) ?? undefined,
    gstRate: (row.gst_rate as number) ?? undefined,
    gstAvailable: (row.gst_available as boolean) ?? true,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ── GET /api/clients ──────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const tenantId = getTenantIdFromRequest(request);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const supabase = createServerSupabaseClient();
  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search");

  // pagination
  const { parsePagination } = await import("@/lib/pagination");
  let { page, pageSize, from, to } = parsePagination(searchParams);

  let query = supabase
    .from("clients")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId);

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`,
    );
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[clients GET]", error);
    return Response.json(
      {
        error: "Unable to load clients. Please try again.",
        userFriendly: true,
      },
      { status: 500 },
    );
  }

  // Calculate actual max pages based on total count
  const totalCount = count ?? 0;
  const maxPages = Math.ceil(totalCount / pageSize) || 1;
  const actualPage = Math.max(1, Math.min(page, maxPages));

  return Response.json({
    data: (data ?? []).map(toClient),
    total: totalCount,
    page: actualPage,
    pageSize,
    maxPages,
  });
}

// ── POST /api/clients ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const tenantId = getTenantIdFromRequest(request);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const supabase = createServerSupabaseClient();
  const body = await request.json();

  if (!body.name?.trim()) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({
      name: body.name.trim(),
      email: body.email?.trim() ?? null,
      phone: body.phone?.trim() ?? null,
      company: body.company?.trim() ?? null,
      address: body.address?.trim() ?? null,
      gst_number: body.gstNumber?.trim() ?? null,
      business_type: body.businessType ?? null,
      gst_rate: body.gstRate ?? 18,
      gst_available: body.gstAvailable ?? true,
      tenant_id: tenantId,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(
    { data: toClient(data as Record<string, unknown>) },
    { status: 201 },
  );
}
