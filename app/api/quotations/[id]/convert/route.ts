import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import type { Invoice, InvoiceStatus } from "@/types/invoice";
import { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

// ── POST /api/quotations/[id]/convert ─────────────────────────────────────────
// Converts a quotation to an invoice and marks it Accepted.

export async function POST(_req: NextRequest, { params }: RouteContext) {
  const tenantId = getTenantIdFromRequest(_req);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const { id: quotationId } = await params;
  const supabase = createServerSupabaseClient();

  // 1. Fetch quotation + its items
  const { data: quotation, error: qErr } = await supabase
    .from("quotations")
    .select("*")
    .eq("id", quotationId)
    .eq("tenant_id", tenantId)
    .single();

  if (qErr) {
    return Response.json(
      { error: qErr.message },
      { status: qErr.code === "PGRST116" ? 404 : 500 },
    );
  }

  const { data: qItems } = await supabase
    .from("quotation_items")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("quotation_id", quotationId);

  // 2. Generate next invoice ID
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  const invoiceId = `INV-${year}-${String((count ?? 0) + 1).padStart(3, "0")}`;

  // 3. Create the invoice
  const today = new Date().toISOString().split("T")[0];
  const dueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .insert({
      id: invoiceId,
      client: quotation.client,
      client_id: quotation.client_id ?? null,
      subtotal: quotation.subtotal,
      gst_rate: quotation.gst_rate,
      gst_amount: quotation.gst_amount,
      total_amount: quotation.total_amount,
      shipping_address: quotation.shipping_address ?? null,
      date: today,
      due_date: dueDate,
      status: "Draft",
      notes: quotation.notes ?? null,
      created_by: quotation.created_by ?? null,
      tenant_id: tenantId,
    })
    .select()
    .single();

  if (invErr) {
    return Response.json({ error: invErr.message }, { status: 500 });
  }

  // 4. Copy line items
  if (qItems?.length) {
    await supabase.from("invoice_items").insert(
      qItems.map((it) => ({
        invoice_id: invoiceId,
        description: it.description,
        quantity: it.quantity,
        unit_price: it.unit_price,
        amount: it.amount,
        tenant_id: tenantId,
      })),
    );
  }

  // 5. Mark quotation as Accepted
  await supabase
    .from("quotations")
    .update({ status: "Accepted" })
    .eq("id", quotationId)
    .eq("tenant_id", tenantId);

  const result: Invoice = {
    id: invoice.id as string,
    client: invoice.client as string,
    items: (qItems ?? []).map((it) => ({
      description: it.description as string,
      quantity: Number(it.quantity),
      unitPrice: Number(it.unit_price),
      amount: Number(it.amount),
    })),
    subtotal: Number(invoice.subtotal),
    gstRate: Number(invoice.gst_rate),
    gstAmount: Number(invoice.gst_amount),
    discountPercentage: 0,
    discountAmount: 0,
    tdsRate: 0,
    tdsAmount: 0,
    tcsRate: 0,
    tcsAmount: 0,
    totalAmount: Number(invoice.total_amount),
    date: invoice.date as string,
    dueDate: invoice.due_date as string,
    status: invoice.status as InvoiceStatus,
  };

  return Response.json({ data: result }, { status: 201 });
}
