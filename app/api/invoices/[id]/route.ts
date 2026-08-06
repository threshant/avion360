import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import type { Invoice, InvoiceStatus } from "@/types/invoice";
import { NextRequest } from "next/server";

function toInvoice(
  row: Record<string, unknown>,
  client?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    gstNumber?: string;
  },
  items: Record<string, unknown>[] = [],
): Invoice {
  return {
    id: row.id as string,
    customerId: (row.client_id as string) ?? undefined,
    client: client?.name,
    clientEmail: client?.email,
    clientPhone: client?.phone,
    clientAddress: client?.address,
    clientGST: client?.gstNumber,
    items: items.map((it) => ({
      description: it.description as string,
      hsnCode: (it.hsn_code as string) ?? undefined,
      quantity: Number(it.quantity),
      unitPrice: Number(it.unit_price),
      amount: Number(it.amount),
    })),
    subtotal: Number(row.subtotal),
    gstRate: Number(row.gst_rate),
    gstAmount: Number(row.gst_amount),
    discountPercentage: Number(row.discount_percentage ?? 0),
    discountAmount: Number(row.discount_amount ?? 0),
    tdsRate: Number(row.tds_rate ?? 0),
    tdsAmount: Number(row.tds_amount ?? 0),
    tcsRate: Number(row.tcs_rate ?? 0),
    tcsAmount: Number(row.tcs_amount ?? 0),
    totalAmount: Number(row.total_amount),
    paidAmount: Number(row.paid_amount ?? 0),
    remaining: Math.max(
      0,
      Number(row.total_amount) - Number(row.paid_amount ?? 0),
    ),
    date: row.date as string,
    dueDate: (row.due_date as string) ?? undefined,
    status: row.status as InvoiceStatus,
    notes: (row.notes as string) ?? undefined,
    shippingAddress: (row.shipping_address as string) ?? undefined,
    currency: (row.currency as string) ?? "INR",
    taxType: ((row.tax_type as string) ?? "CGST_SGST") as "CGST_SGST" | "IGST",
    signatoryName: (row.signatory_name as string) ?? undefined,
    createdBy: (row.created_by as string) ?? undefined,
  };
}

async function getClientDetails(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  tenantId: string,
  clientId?: string,
) {
  if (!clientId) return undefined;

  const { data } = await supabase
    .from("clients")
    .select("name,company,email,phone,address,gst_number")
    .eq("tenant_id", tenantId)
    .eq("id", clientId)
    .single();

  if (!data) return undefined;
  const name = String(data.name ?? "").trim();
  const company = String(data.company ?? "").trim();
  return {
    name: name || company || undefined,
    email: String(data.email ?? "").trim() || undefined,
    phone: String(data.phone ?? "").trim() || undefined,
    address: String(data.address ?? "").trim() || undefined,
    gstNumber: String(data.gst_number ?? "").trim() || undefined,
  };
}

type RouteContext = { params: Promise<{ id: string }> };

// ── GET /api/invoices/[id] ────────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const tenantId = getTenantIdFromRequest(_req);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { data: invoice, error } = await supabase
    .from("invoices")
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
    .from("invoice_items")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("invoice_id", id);

  const clientDetails = await getClientDetails(
    supabase,
    tenantId,
    String((invoice as Record<string, unknown>).client_id ?? ""),
  );

  return Response.json({
    data: toInvoice(
      invoice as Record<string, unknown>,
      clientDetails,
      (items ?? []) as Record<string, unknown>[],
    ),
  });
}

// ── PATCH /api/invoices/[id] ──────────────────────────────────────────────────

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
  if (body.discountPercentage !== undefined)
    patch.discount_percentage = body.discountPercentage;
  if (body.tdsRate !== undefined) patch.tds_rate = body.tdsRate;
  if (body.tcsRate !== undefined) patch.tcs_rate = body.tcsRate;
  if (body.date !== undefined) patch.date = body.date;
  if (body.dueDate !== undefined) patch.due_date = body.dueDate;
  if (body.status !== undefined) patch.status = body.status;
  if (body.notes !== undefined) patch.notes = body.notes;
  if (body.shippingAddress !== undefined)
    patch.shipping_address = body.shippingAddress;
  if (body.currency !== undefined) patch.currency = body.currency;
  if (body.taxType !== undefined) patch.tax_type = body.taxType;
  if (body.signatoryName !== undefined)
    patch.signatory_name = body.signatoryName;
  if (body.createdBy !== undefined) patch.created_by = body.createdBy;

  // Recompute totals if items are provided
  if (body.items !== undefined) {
    const subtotal = (body.items as { amount: number }[]).reduce(
      (s, it) => s + it.amount,
      0,
    );
    const discountPercentage = Number(
      body.discountPercentage ?? patch.discount_percentage ?? 0,
    );
    const discountAmount = Math.round((subtotal * discountPercentage) / 100);
    const taxableAmount = subtotal - discountAmount;

    const gstRate = Number(body.gstRate ?? patch.gst_rate ?? 18);
    const gstAmount = Math.round((taxableAmount * gstRate) / 100);

    const tdsRate = Number(body.tdsRate ?? patch.tds_rate ?? 0);
    const tdsAmount = Math.round((taxableAmount * tdsRate) / 100);

    const tcsRate = Number(body.tcsRate ?? patch.tcs_rate ?? 0);
    const tcsAmount = Math.round((taxableAmount * tcsRate) / 100);

    patch.subtotal = subtotal;
    patch.discount_percentage = discountPercentage;
    patch.discount_amount = discountAmount;
    patch.gst_rate = gstRate;
    patch.gst_amount = gstAmount;
    patch.tds_rate = tdsRate;
    patch.tds_amount = tdsAmount;
    patch.tcs_rate = tcsRate;
    patch.tcs_amount = tcsAmount;

    const totalAmount = taxableAmount + gstAmount + tdsAmount + tcsAmount;
    patch.total_amount = totalAmount;
  }

  const { data: invoice, error } = await supabase
    .from("invoices")
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

  // Replace line items if provided
  if (body.items !== undefined) {
    await supabase
      .from("invoice_items")
      .delete()
      .eq("invoice_id", id)
      .eq("tenant_id", tenantId);
    if (body.items.length) {
      await supabase.from("invoice_items").insert(
        (
          body.items as {
            description: string;
            hsnCode?: string;
            quantity: number;
            unitPrice: number;
            amount: number;
          }[]
        ).map((it) => ({
          invoice_id: id,
          description: it.description,
          hsn_code: it.hsnCode ?? null,
          quantity: it.quantity,
          unit_price: it.unitPrice,
          amount: it.amount,
          tenant_id: tenantId,
        })),
      );
    }
  }

  const { data: items } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("invoice_id", id);

  const clientDetails = await getClientDetails(
    supabase,
    tenantId,
    String((invoice as Record<string, unknown>).client_id ?? ""),
  );

  return Response.json({
    data: toInvoice(
      invoice as Record<string, unknown>,
      clientDetails,
      (items ?? []) as Record<string, unknown>[],
    ),
  });
}

// ── DELETE /api/invoices/[id] ─────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const tenantId = getTenantIdFromRequest(_req);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return new Response(null, { status: 204 });
}
