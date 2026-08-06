import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import type { Staff } from "@/types/warehouse";
import { NextRequest } from "next/server";

function toStaff(row: Record<string, unknown>): Staff {
  return {
    id: row.id as string,
    name: row.name as string,
    warehouseId: (row.warehouse_id as string) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ── GET /api/staff ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const tenantId = getTenantIdFromRequest(request);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const supabase = createServerSupabaseClient();
  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search");
  const warehouseId = searchParams.get("warehouseId");

  const { parsePagination } = await import("@/lib/pagination");
  const { page, pageSize, from, to } = parsePagination(searchParams);

  let query = supabase
    .from("staff")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId);

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  if (warehouseId) {
    query = query.eq("warehouse_id", warehouseId);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[staff GET]", error);
    return Response.json(
      {
        error: "Unable to load staff members. Please try again.",
        userFriendly: true,
      },
      { status: 500 },
    );
  }

  return Response.json({
    data: (data ?? []).map(toStaff),
    total: count ?? 0,
    page,
    pageSize,
  });
}

// ── POST /api/staff ─────────────────────────────────────────────────────────

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
    .from("staff")
    .insert({
      name: body.name.trim(),
      warehouse_id: body.warehouseId ?? null,
      tenant_id: tenantId,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(
    { data: toStaff(data as Record<string, unknown>) },
    { status: 201 },
  );
}
