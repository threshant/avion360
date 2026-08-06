import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { hasColumn } from "@/lib/schemaCompat";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import type { Quotation, QuotationStatus } from "@/types/invoice";
import { NextRequest } from "next/server";

function toQuotation(
  row: Record<string, unknown>,
  items: Record<string, unknown>[] = [],
): Quotation {
  return {
    id: row.id as string,
    quotationNumber: (row.quotation_number as string) ?? (row.id as string),
    customerId: (row.client_id as string) ?? undefined,
    client: "", // Will be populated from client_id if needed
    items: items.map((it) => ({
      product: (it.product as string) ?? (it.description as string),
      description: it.description as string,
      quantity: Number(it.quantity),
      unitPrice: Number(it.unit_price),
      amount: Number(it.amount),
    })),
    subtotal: Number(row.subtotal),
    gstRate: Number(row.gst_rate),
    gstAmount: Number(row.gst_amount),
    totalAmount: Number(row.total_amount),
    date: row.date as string,
    validUntil: row.valid_until as string,
    status: row.status as QuotationStatus,
    notes: (row.notes as string) ?? undefined,
    shippingAddress: (row.shipping_address as string) ?? undefined,
    createdBy: (row.created_by as string) ?? undefined,
  };
}

type RouteContext = { params: Promise<{ id: string }> };

// ── GET /api/quotations/[id] ──────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const tenantId = getTenantIdFromRequest(_req);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { data: quotation, error } = await supabase
    .from("quotations")
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

  const { data: items } = await supabase
    .from("quotation_items")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("quotation_id", id);

  return Response.json({
    data: toQuotation(
      quotation as Record<string, unknown>,
      (items ?? []) as Record<string, unknown>[],
    ),
  });
}

// ── PATCH /api/quotations/[id] ────────────────────────────────────────────────

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
  if (body.gstRate !== undefined) patch.gst_rate = body.gstRate;
  if (body.date !== undefined) patch.date = body.date;
  if (body.validUntil !== undefined) patch.valid_until = body.validUntil;
  if (body.status !== undefined) patch.status = body.status;
  if (body.notes !== undefined) patch.notes = body.notes;
  if (body.shippingAddress !== undefined)
    patch.shipping_address = body.shippingAddress;
  if (body.createdBy !== undefined) patch.created_by = body.createdBy;

  if (body.items !== undefined) {
    const subtotal = (body.items as { amount: number }[]).reduce(
      (s, it) => s + it.amount,
      0,
    );
    const gstRate = Number(body.gstRate ?? patch.gst_rate ?? 18);
    patch.subtotal = subtotal;
    patch.gst_rate = gstRate;
    patch.gst_amount = Math.round((subtotal * gstRate) / 100);
    patch.total_amount = subtotal + (patch.gst_amount as number);
  }

  const { data: quotation, error } = await supabase
    .from("quotations")
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

  if (body.items !== undefined) {
    await supabase
      .from("quotation_items")
      .delete()
      .eq("quotation_id", id)
      .eq("tenant_id", tenantId);
    if (body.items.length) {
      const productColumn = await hasColumn("quotation_items", "product");
      await supabase.from("quotation_items").insert(
        (
          body.items as {
            product?: string;
            description: string;
            quantity: number;
            unitPrice: number;
            amount: number;
            inventoryItemId?: string;
          }[]
        ).map((it) => ({
          quotation_id: id,
          ...(productColumn ? { product: it.product ?? it.description } : {}),
          description: it.description ?? it.product ?? "",
          quantity: it.quantity,
          unit_price: it.unitPrice,
          amount: it.amount,
          tenant_id: tenantId,
        })),
      );
    }
  }

  const { data: items } = await supabase
    .from("quotation_items")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("quotation_id", id);

  return Response.json({
    data: toQuotation(
      quotation as Record<string, unknown>,
      (items ?? []) as Record<string, unknown>[],
    ),
  });
}

// ── DELETE /api/quotations/[id] ───────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const tenantId = getTenantIdFromRequest(_req);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from("quotations")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return new Response(null, { status: 204 });
}
