import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import type { Warehouse } from "@/types/warehouse";
import { NextRequest } from "next/server";

function toWarehouse(row: Record<string, unknown>): Warehouse {
  return {
    id: row.id as string,
    name: row.name as string,
    location: (row.location as string) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ── GET /api/warehouses ──────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const tenantId = getTenantIdFromRequest(request);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const supabase = createServerSupabaseClient();
  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search");

  let query = supabase
    .from("warehouses")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId);

  if (search) {
    query = query.or(`name.ilike.%${search}%,location.ilike.%${search}%`);
  }

  const { data, error, count } = await query.order("created_at", {
    ascending: false,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    data: (data ?? []).map(toWarehouse),
    total: count ?? 0,
  });
}

// ── POST /api/warehouses ────────────────────────────────────────────────────

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
    .from("warehouses")
    .insert({
      name: body.name.trim(),
      location: body.location?.trim() ?? null,
      tenant_id: tenantId,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(
    { data: toWarehouse(data as Record<string, unknown>) },
    { status: 201 },
  );
}
