import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { hasColumn } from "@/lib/schemaCompat";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import type { ProformaInvoice, ProformaStatus } from "@/types/invoice";
import { NextRequest } from "next/server";

function toProforma(
  row: Record<string, unknown>,
  items: Record<string, unknown>[] = [],
  client?: Record<string, unknown>,
): ProformaInvoice {
  return {
    id: row.id as string,
    customerId: (row.client_id as string) ?? undefined,
    client: (client?.name as string) ?? undefined,
    clientPhone: (client?.phone as string) ?? undefined,
    clientEmail: (client?.email as string) ?? undefined,
    clientAddress: (client?.address as string) ?? undefined,
    clientGST: (client?.gst_number as string) ?? undefined,
    items: items.map((it) => ({
      product: (it.product as string) ?? (it.description as string) ?? "",
      description: it.description as string,
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
    date: row.date as string,
    dueDate: (row.due_date as string) ?? undefined,
    validUntil: (row.valid_until as string) ?? undefined,
    status: row.status as ProformaStatus,
    notes: (row.notes as string) ?? undefined,
    shippingAddress: (row.shipping_address as string) ?? undefined,
    quotationId: (row.quotation_id as string) ?? undefined,
    createdBy: (row.created_by as string) ?? undefined,
  };
}

async function nextProformaId(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  tenantId: string,
) {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("proforma_invoices")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  const n = (count ?? 0) + 1;
  return `PI-${year}-${String(n).padStart(3, "0")}`;
}

export async function GET(request: NextRequest) {
  const tenantId = getTenantIdFromRequest(request);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const supabase = createServerSupabaseClient();
  const { searchParams } = request.nextUrl;
  const { parsePagination } = await import("@/lib/pagination");
  const { page, pageSize, from, to } = parsePagination(searchParams);

  const status = searchParams.get("status");
  const clientId = searchParams.get("clientId");
  const search = searchParams.get("search");

  let query = supabase
    .from("proforma_invoices")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId);

  if (status) query = query.eq("status", status);
  if (clientId) query = query.eq("client_id", clientId);
  if (search) query = query.ilike("id", `%${search}%`);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const proformaIds = (data ?? []).map((r) => r.id as string);
  const { data: lineItems } = proformaIds.length
    ? await supabase
        .from("proforma_invoice_items")
        .select("*")
        .eq("tenant_id", tenantId)
        .in("proforma_id", proformaIds)
    : { data: [] };

  const itemsByProforma: Record<string, Record<string, unknown>[]> = {};
  for (const li of lineItems ?? []) {
    const key = li.proforma_id as string;
    if (!itemsByProforma[key]) itemsByProforma[key] = [];
    itemsByProforma[key].push(li as Record<string, unknown>);
  }

  // Fetch client names
  const clientIds = [
    ...new Set((data ?? []).map((r) => r.client_id as string).filter(Boolean)),
  ];
  const { data: clientRows } = clientIds.length
    ? await supabase
        .from("clients")
        .select("id,name,email,phone,address,gst_number")
        .eq("tenant_id", tenantId)
        .in("id", clientIds)
    : { data: [] };
  const clientMap: Record<string, string> = {};
  const clientDetailsMap: Record<string, Record<string, unknown>> = {};
  for (const c of clientRows ?? []) {
    clientMap[c.id as string] = c.name as string;
    clientDetailsMap[c.id as string] = c as Record<string, unknown>;
  }

  return Response.json({
    data: (data ?? []).map((r) => {
      const p = toProforma(
        r as Record<string, unknown>,
        itemsByProforma[r.id as string] ?? [],
        clientDetailsMap[r.client_id as string],
      );
      return p;
    }),
    total: count ?? 0,
    page,
    pageSize,
  });
}

export async function POST(request: NextRequest) {
  const tenantId = getTenantIdFromRequest(request);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const supabase = createServerSupabaseClient();
  const body = await request.json();

  let clientId: string | undefined = body.clientId;
  let date: string | undefined = body.date;
  const quotationId: string | null = body.quotationId ?? null;
  let gstRate: number | undefined =
    body.gstRate !== undefined ? Number(body.gstRate) : undefined;
  let items = body.items as {
    product?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    serviceType?: string;
  }[];

  // When raising a proforma from a quotation, pull authoritative data from the
  // database so the proforma is created even if the client-side quotation
  // object is stale or missing line items.
  if (quotationId) {
    const { data: quotation } = await supabase
      .from("quotations")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", quotationId)
      .single();

    if (quotation) {
      clientId = clientId ?? (quotation.client_id as string);
      if (gstRate === undefined) gstRate = Number(quotation.gst_rate);
      if (!date) date = quotation.date as string;

      if (!items || !items.length) {
        const { data: qItems } = await supabase
          .from("quotation_items")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("quotation_id", quotationId);
        items = (qItems ?? []).map((it) => ({
          product: (it.product as string) ?? (it.description as string),
          description: it.description as string,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unit_price),
          amount: Number(it.amount),
        }));
      }
    }
  }

  if (!clientId) {
    return Response.json(
      { error: "A client must be selected." },
      { status: 400 },
    );
  }

  // Some older quotations only carry totals (no stored line items). Fall back
  // to a single line item so the proforma can still be raised.
  if (!items || !items.length) {
    const fallbackAmount = Number(body.subtotal ?? 0);
    if (fallbackAmount <= 0) {
      return Response.json(
        { error: "At least one item is required." },
        { status: 400 },
      );
    }
    items = [
      {
        description: quotationId
          ? `Services as per quotation ${quotationId}`
          : "Services",
        quantity: 1,
        unitPrice: fallbackAmount,
        amount: fallbackAmount,
      },
    ];
  }

  const subtotal: number = items.reduce((s, it) => s + it.amount, 0);

  const discountPercentage = Number(body.discountPercentage ?? 0);
  const discountAmount = Math.round((subtotal * discountPercentage) / 100);
  const taxableAmount = subtotal - discountAmount;

  gstRate = gstRate ?? 18;
  const gstAmount = Math.round((taxableAmount * gstRate) / 100);

  const tdsRate = Number(body.tdsRate ?? 0);
  const tdsAmount = Math.round((taxableAmount * tdsRate) / 100);

  const tcsRate = Number(body.tcsRate ?? 0);
  const tcsAmount = Math.round((taxableAmount * tcsRate) / 100);

  const totalAmount = taxableAmount + gstAmount + tdsAmount + tcsAmount;

  const id = await nextProformaId(supabase, tenantId);

  const insert: Record<string, unknown> = {
    id,
    client_id: clientId,
    subtotal,
    gst_rate: gstRate,
    gst_amount: gstAmount,
    discount_percentage: discountPercentage,
    discount_amount: discountAmount,
    tds_rate: tdsRate,
    tds_amount: tdsAmount,
    tcs_rate: tcsRate,
    tcs_amount: tcsAmount,
    total_amount: totalAmount,
    date: date ?? new Date().toISOString().slice(0, 10),
    valid_until: body.validUntil ?? null,
    status: body.status ?? "Draft",
    notes: body.notes ?? null,
    shipping_address: body.shippingAddress ?? null,
    quotation_id: quotationId,
    created_by: body.createdBy ?? null,
    tenant_id: tenantId,
  };

  // due_date is only present on newer deployments
  if (await hasColumn("proforma_invoices", "due_date")) {
    const issueDate = (date ?? new Date().toISOString().slice(0, 10)) as string;
    insert.due_date = body.dueDate
      ? body.dueDate
      : issueDate
        ? new Date(new Date(issueDate).getTime() + 7 * 86400000)
            .toISOString()
            .slice(0, 10)
        : null;
  }

  const { data: proforma, error } = await supabase
    .from("proforma_invoices")
    .insert(insert)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  let savedItems: Record<string, unknown>[] = [];
  if (items.length) {
    const productColumn = await hasColumn("proforma_invoice_items", "product");
    const { data: lineItems, error: itemsErr } = await supabase
      .from("proforma_invoice_items")
      .insert(
        items.map((it) => ({
          proforma_id: id,
          tenant_id: tenantId,
          ...(productColumn ? { product: it.product ?? it.description } : {}),
          description: it.description ?? it.product ?? "",
          quantity: it.quantity,
          unit_price: it.unitPrice,
          amount: it.amount,
          service_type: it.serviceType ?? null,
        })),
      )
      .select();

    if (itemsErr)
      return Response.json({ error: itemsErr.message }, { status: 500 });
    savedItems = (lineItems ?? []) as Record<string, unknown>[];
  }

  const { data: client } = proforma?.client_id
    ? await supabase
        .from("clients")
        .select("id,name,email,phone,address,gst_number")
        .eq("tenant_id", tenantId)
        .eq("id", proforma.client_id)
        .single()
    : { data: null };

  return Response.json(
    {
      data: toProforma(
        proforma as Record<string, unknown>,
        savedItems,
        client as Record<string, unknown> | undefined,
      ),
    },
    { status: 201 },
  );
}
