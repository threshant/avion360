import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest } from "next/server";

// POST /api/proforma-invoices/[id]/convert
// Converts a proforma invoice into a final invoice
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

  const { data: proforma, error: fetchErr } = await supabase
    .from("proforma_invoices")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (fetchErr || !proforma) {
    return Response.json({ error: "Proforma not found" }, { status: 404 });
  }

  const { data: items } = await supabase
    .from("proforma_invoice_items")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("proforma_id", id);

  // Generate invoice ID
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  const n = (count ?? 0) + 1;
  const invoiceId = `INV-${year}-${String(n).padStart(3, "0")}`;

  const today = new Date().toISOString().slice(0, 10);
  const dueDate =
    body.dueDate ??
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .insert({
      id: invoiceId,
      client_id: proforma.client_id,
      subtotal: proforma.subtotal,
      gst_rate: proforma.gst_rate,
      gst_amount: proforma.gst_amount,
      discount_percentage: proforma.discount_percentage,
      discount_amount: proforma.discount_amount,
      tds_rate: proforma.tds_rate,
      tds_amount: proforma.tds_amount,
      tcs_rate: proforma.tcs_rate,
      tcs_amount: proforma.tcs_amount,
      total_amount: proforma.total_amount,
      shipping_address: proforma.shipping_address,
      date: today,
      due_date: dueDate,
      status: "Draft",
      notes: proforma.notes,
      created_by: body.createdBy ?? null,
      tenant_id: tenantId,
    })
    .select()
    .single();

  if (invErr) return Response.json({ error: invErr.message }, { status: 500 });

  if (items?.length) {
    await supabase.from("invoice_items").insert(
      items.map((it) => ({
        invoice_id: invoiceId,
        description: it.description,
        quantity: it.quantity,
        unit_price: it.unit_price,
        amount: it.amount,
        tenant_id: tenantId,
      })),
    );
  }

  // Mark proforma as converted
  await supabase
    .from("proforma_invoices")
    .update({ status: "Converted", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  return Response.json({ data: invoice, invoiceId }, { status: 201 });
}
