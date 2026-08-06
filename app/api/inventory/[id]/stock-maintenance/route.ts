import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import type { StockMaintenance } from "@/types/stockMaintenance";
import { NextRequest } from "next/server";

function toStockMaintenance(row: Record<string, unknown>): StockMaintenance {
  return {
    id: row.id as string,
    inventoryItemId: row.inventory_item_id as string,
    previousQuantity: row.previous_quantity as number,
    newQuantity: row.new_quantity as number,
    changeReason: row.change_reason as string,
    changedBy: (row.changed_by as string) ?? undefined,
    createdAt: row.created_at as string,
  };
}

// ── GET /api/inventory/[id]/stock-maintenance ────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = getTenantIdFromRequest(request);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { data, error, count } = await supabase
    .from("stock_maintenance")
    .select("*", { count: "exact" })
    .eq("inventory_item_id", id)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    data: (data ?? []).map(toStockMaintenance),
    total: count ?? 0,
  });
}

// ── POST /api/inventory/[id]/stock-maintenance ───────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = getTenantIdFromRequest(request);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  const body = await request.json();

  if (
    body.previousQuantity == null ||
    body.newQuantity == null ||
    !body.changeReason?.trim()
  ) {
    return Response.json(
      { error: "previousQuantity, newQuantity, and changeReason are required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("stock_maintenance")
    .insert({
      inventory_item_id: id,
      previous_quantity: body.previousQuantity,
      new_quantity: body.newQuantity,
      change_reason: body.changeReason.trim(),
      changed_by: body.changedBy?.trim() ?? null,
      tenant_id: tenantId,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(
    { data: toStockMaintenance(data as Record<string, unknown>) },
    { status: 201 },
  );
}
