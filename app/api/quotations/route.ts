import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { hasColumn } from "@/lib/schemaCompat";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import type { Quotation, QuotationStatus } from "@/types/invoice";
import { NextRequest } from "next/server";

// ── helpers ──────────────────────────────────────────────────────────────────

function toQuotation(
  row: Record<string, unknown>,
  items: Record<string, unknown>[] = [],
  client?: Record<string, unknown>,
): Quotation {
  return {
    id: row.id as string,
    quotationNumber: (row.quotation_number as string) ?? (row.id as string),
    customerId: (row.client_id as string) ?? undefined,
    client: (client?.name as string) ?? "",
    clientEmail: client?.email as string,
    clientPhone: client?.phone as string,
    clientAddress: client?.address as string,
    clientGST: client?.gst_number as string,
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

async function nextQuotationId(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  tenantId: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `QUO-${year}-`;
  const { data } = await supabase
    .from("quotations")
    .select("id")
    .eq("tenant_id", tenantId)
    .like("id", `${prefix}%`)
    .order("id", { ascending: false })
    .limit(1);
  const lastNum = data?.[0]?.id
    ? parseInt((data[0].id as string).replace(prefix, ""), 10)
    : 0;
  return `${prefix}${String(lastNum + 1).padStart(3, "0")}`;
}

// ── GET /api/quotations ───────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const tenantId = getTenantIdFromRequest(request);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const supabase = createServerSupabaseClient();
  const { searchParams } = request.nextUrl;

  const status = searchParams.get("status");
  const clientId = searchParams.get("clientId");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const search = searchParams.get("search");
  const { parsePagination } = await import("@/lib/pagination");
  const { page, pageSize, from, to } = parsePagination(searchParams);

  let query = supabase
    .from("quotations")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId);

  if (status) query = query.eq("status", status);
  if (clientId) query = query.eq("client_id", clientId);
  if (dateFrom) query = query.gte("date", dateFrom);
  if (dateTo) query = query.lte("date", dateTo);
  if (search) {
    query = query.ilike("id", `%${search}%`);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const quotationIds = (data ?? []).map((r) => r.id as string);
  const { data: lineItems } = quotationIds.length
    ? await supabase
        .from("quotation_items")
        .select("*")
        .eq("tenant_id", tenantId)
        .in("quotation_id", quotationIds)
    : { data: [] };

  const itemsByQuotation: Record<string, Record<string, unknown>[]> = {};
  for (const li of lineItems ?? []) {
    const key = li.quotation_id as string;
    if (!itemsByQuotation[key]) itemsByQuotation[key] = [];
    itemsByQuotation[key].push(li as Record<string, unknown>);
  }

  const clientIds = [
    ...new Set((data ?? []).map((r) => r.client_id as string).filter(Boolean)),
  ];
  const { data: clientRows } = clientIds.length
    ? await supabase
        .from("clients")
        .select("*")
        .eq("tenant_id", tenantId)
        .in("id", clientIds)
    : { data: [] };
  const clientMap: Record<string, Record<string, unknown>> = {};
  for (const c of clientRows ?? [])
    clientMap[c.id as string] = c as Record<string, unknown>;

  return Response.json({
    data: (data ?? []).map((r) =>
      toQuotation(
        r as Record<string, unknown>,
        itemsByQuotation[r.id as string] ?? [],
        clientMap[r.client_id as string],
      ),
    ),
    total: count ?? 0,
    page,
    pageSize,
  });
}

// ── POST /api/quotations ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const tenantId = getTenantIdFromRequest(request);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const supabase = createServerSupabaseClient();
  const body = await request.json();

  if (!body.clientId) {
    return Response.json(
      { error: "A client must be selected." },
      { status: 400 },
    );
  }

  if (!body.items || !(body.items as { amount: number }[]).length) {
    return Response.json(
      { error: "At least one item is required." },
      { status: 400 },
    );
  }

  const subtotal: number = body.items
    ? (body.items as { amount: number }[]).reduce((s, it) => s + it.amount, 0)
    : Number(body.subtotal ?? 0);
  const gstRate = Number(body.gstRate ?? 18);
  const gstAmount = Math.round((subtotal * gstRate) / 100);
  const totalAmount = subtotal + gstAmount;

  const id = await nextQuotationId(supabase, tenantId);

  const { data: quotation, error } = await supabase
    .from("quotations")
    .insert({
      id,
      client_id: body.clientId,
      subtotal,
      gst_rate: gstRate,
      gst_amount: gstAmount,
      total_amount: totalAmount,
      date: body.date,
      valid_until: body.validUntil,
      status: body.status ?? "Draft",
      notes: body.notes ?? null,
      shipping_address: body.shippingAddress ?? null,
      created_by: body.createdBy ?? null,
      tenant_id: tenantId,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  let savedItems: Record<string, unknown>[] = [];
  if (body.items?.length) {
    const productColumn = await hasColumn("quotation_items", "product");
    const { data: items, error: itemsErr } = await supabase
      .from("quotation_items")
      .insert(
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
      )
      .select();

    if (itemsErr) {
      return Response.json({ error: itemsErr.message }, { status: 500 });
    }
    savedItems = (items ?? []) as Record<string, unknown>[];
  }

  return Response.json(
    { data: toQuotation(quotation as Record<string, unknown>, savedItems) },
    { status: 201 },
  );
}
