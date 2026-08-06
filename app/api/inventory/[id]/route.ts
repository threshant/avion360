import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import type { InventoryItem, InventoryStatus } from "@/types/inventory";
import { NextRequest } from "next/server";

function toItem(row: Record<string, unknown>): InventoryItem {
  return {
    id: row.id as string,
    clientId: (row.client_id as string) ?? undefined,
    commodity: row.commodity as string,
    description: (row.description as string) ?? undefined,
    cbm: Number(row.cbm),
    quantity: Number(row.quantity),
    unit: (row.unit as string) ?? undefined,
    packing: row.packing as string,
    warehouseId: row.warehouse_id as string,
    warehouseLocation: (row.warehouse_location as string) ?? undefined,
    staffId: (row.staff_id as string) ?? undefined,
    status: row.status as InventoryStatus,
    receivedDate: (row.received_date as string) ?? undefined,
    expectedDelivery: (row.expected_delivery as string) ?? undefined,
    notes: (row.notes as string) ?? undefined,
    createdAt: (row.created_at as string) ?? undefined,
    updatedAt: (row.updated_at as string) ?? undefined,
  };
}

type RouteContext = { params: Promise<{ id: string }> };

// ── GET /api/inventory/[id] ───────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const tenantId = getTenantIdFromRequest(_req);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("inventory_items")
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

  return Response.json({ data: toItem(data) });
}

// ── PATCH /api/inventory/[id] ─────────────────────────────────────────────────

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const tenantId = getTenantIdFromRequest(request);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  const body = await request.json();

  const patch: Record<string, unknown> = {};
  if (body.clientId !== undefined) patch.client_id = body.clientId;
  if (body.commodity !== undefined) patch.commodity = body.commodity;
  if (body.description !== undefined) patch.description = body.description;
  if (body.cbm !== undefined) patch.cbm = body.cbm;
  if (body.quantity !== undefined) patch.quantity = body.quantity;
  if (body.unit !== undefined) patch.unit = body.unit;
  if (body.packing !== undefined) patch.packing = body.packing;
  if (body.warehouseId !== undefined) patch.warehouse_id = body.warehouseId;
  if (body.warehouseLocation !== undefined)
    patch.warehouse_location = body.warehouseLocation;
  if (body.staffId !== undefined) patch.staff_id = body.staffId;
  if (body.status !== undefined) patch.status = body.status;
  if (body.receivedDate !== undefined) patch.received_date = body.receivedDate;
  if (body.expectedDelivery !== undefined)
    patch.expected_delivery = body.expectedDelivery;
  if (body.notes !== undefined) patch.notes = body.notes;

  const { data, error } = await supabase
    .from("inventory_items")
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

  return Response.json({ data: toItem(data) });
}

// ── DELETE /api/inventory/[id] ────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const tenantId = getTenantIdFromRequest(_req);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from("inventory_items")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return new Response(null, { status: 204 });
}
