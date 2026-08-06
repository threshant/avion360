import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { hasColumn } from "@/lib/schemaCompat";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = getTenantIdFromRequest(_request);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("proforma_invoices")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 404 });

  const { data: items } = await supabase
    .from("proforma_invoice_items")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("proforma_id", id);

  const { data: client } = data.client_id
    ? await supabase
        .from("clients")
        .select("name,email,phone,address,gst_number")
        .eq("id", data.client_id)
        .eq("tenant_id", tenantId)
        .single()
    : { data: null };

  return Response.json({
    data: {
      ...data,
      client: client?.name ?? undefined,
      clientEmail: client?.email ?? undefined,
      clientPhone: client?.phone ?? undefined,
      clientAddress: client?.address ?? undefined,
      clientGST: client?.gst_number ?? undefined,
      items: (items ?? []).map((it) => ({
        ...it,
        product: it.product ?? undefined,
      })),
    },
  });
}

export async function PATCH(
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

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (body.status !== undefined) updates.status = body.status;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.shippingAddress !== undefined)
    updates.shipping_address = body.shippingAddress;
  if (body.validUntil !== undefined) updates.valid_until = body.validUntil;
  if (
    body.dueDate !== undefined &&
    (await hasColumn("proforma_invoices", "due_date"))
  ) {
    updates.due_date = body.dueDate;
  }
  if (body.date !== undefined) updates.date = body.date;

  const { data, error } = await supabase
    .from("proforma_invoices")
    .update(updates)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = getTenantIdFromRequest(_request);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from("proforma_invoices")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return new Response(null, { status: 204 });
}
