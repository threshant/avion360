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

type RouteContext = { params: Promise<{ id: string }> };

// ── GET /api/staff/[id] ───────────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const tenantId = getTenantIdFromRequest(_req);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (error) {
    return Response.json(
      { error: error.message },
      { status: error.code === "PGRST116" ? 404 : 500 },
    );
  }

  return Response.json({ data: toStaff(data as Record<string, unknown>) });
}

// ── PATCH /api/staff/[id] ─────────────────────────────────────────────────────

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const tenantId = getTenantIdFromRequest(request);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  const body = await request.json();

  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.warehouseId !== undefined)
    patch.warehouse_id = body.warehouseId ?? null;

  const { data, error } = await supabase
    .from("staff")
    .update(patch)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) {
    return Response.json(
      { error: error.message },
      { status: error.code === "PGRST116" ? 404 : 500 },
    );
  }

  return Response.json({ data: toStaff(data as Record<string, unknown>) });
}

// ── DELETE /api/staff/[id] ────────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const tenantId = getTenantIdFromRequest(_req);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from("staff")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return new Response(null, { status: 204 });
}
