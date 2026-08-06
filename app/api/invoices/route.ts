import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import type { Invoice, InvoiceStatus } from "@/types/invoice";
import { NextRequest } from "next/server";

// ── helpers ──────────────────────────────────────────────────────────────────

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

async function nextInvoiceId(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  tenantId: string,
  options?: {
    prefix?: string;
    suffix?: string;
    start?: number;
    padding?: number;
  },
) {
  const year = new Date().getFullYear();
  const prefix = String(options?.prefix ?? `INV-${year}-`).trim();
  const suffix = String(options?.suffix ?? "").trim();
  const start = Math.max(1, Math.trunc(Number(options?.start ?? 1) || 1));
  const padding = Math.min(
    10,
    Math.max(1, Math.trunc(Number(options?.padding ?? 3) || 3)),
  );

  const likePattern = suffix ? `${prefix}%${suffix}` : `${prefix}%`;
  const { data } = await supabase
    .from("invoices")
    .select("id")
    .eq("tenant_id", tenantId)
    .like("id", likePattern);

  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedSuffix = suffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const seriesRegex = new RegExp(`^${escapedPrefix}(\\d+)${escapedSuffix}$`);

  let maxSeries = start - 1;
  for (const row of data ?? []) {
    const id = String((row as { id?: string }).id ?? "");
    const matched = id.match(seriesRegex);
    if (!matched?.[1]) continue;

    const parsed = Number.parseInt(matched[1], 10);
    if (Number.isNaN(parsed)) continue;
    if (parsed > maxSeries) maxSeries = parsed;
  }

  const next = maxSeries + 1;
  return `${prefix}${String(next).padStart(padding, "0")}${suffix}`;
}

async function getClientNameMap(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  tenantId: string,
  clientIds: string[],
) {
  const uniqueClientIds = Array.from(new Set(clientIds.filter(Boolean)));
  if (uniqueClientIds.length === 0) {
    return new Map<
      string,
      {
        name?: string;
        email?: string;
        phone?: string;
        address?: string;
        gstNumber?: string;
      }
    >();
  }

  const { data } = await supabase
    .from("clients")
    .select("id,name,company,email,phone,address,gst_number")
    .eq("tenant_id", tenantId)
    .in("id", uniqueClientIds);

  const clientMap = new Map<
    string,
    {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      gstNumber?: string;
    }
  >();
  for (const client of data ?? []) {
    const name = String(client.name ?? "").trim();
    const company = String(client.company ?? "").trim();
    const displayName = name || company;
    clientMap.set(String(client.id), {
      name: displayName || undefined,
      email: String(client.email ?? "").trim() || undefined,
      phone: String(client.phone ?? "").trim() || undefined,
      address: String(client.address ?? "").trim() || undefined,
      gstNumber: String(client.gst_number ?? "").trim() || undefined,
    });
  }

  return clientMap;
}

// ── GET /api/invoices ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const tenantId = getTenantIdFromRequest(request);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const supabase = createServerSupabaseClient();
  const { searchParams } = request.nextUrl;

  const status = searchParams.get("status");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const search = searchParams.get("search");
  const clientId = searchParams.get("clientId");
  const { parsePagination } = await import("@/lib/pagination");
  const { page, pageSize, from, to } = parsePagination(searchParams);

  let query = supabase
    .from("invoices")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId);

  if (clientId) query = query.eq("client_id", clientId);
  if (status) query = query.eq("status", status);
  if (dateFrom) query = query.gte("date", dateFrom);
  if (dateTo) query = query.lte("date", dateTo);
  if (search) {
    query = query.or(`client.ilike.%${search}%,id.ilike.%${search}%`);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // fetch line items for all returned invoices
  const invoiceIds = (data ?? []).map((r) => r.id as string);
  const { data: lineItems } = invoiceIds.length
    ? await supabase
        .from("invoice_items")
        .select("*")
        .eq("tenant_id", tenantId)
        .in("invoice_id", invoiceIds)
    : { data: [] };

  const itemsByInvoice: Record<string, Record<string, unknown>[]> = {};
  for (const li of lineItems ?? []) {
    const key = li.invoice_id as string;
    if (!itemsByInvoice[key]) itemsByInvoice[key] = [];
    itemsByInvoice[key].push(li as Record<string, unknown>);
  }

  const clientNameMap = await getClientNameMap(
    supabase,
    tenantId,
    (data ?? [])
      .map((r) => r.client_id as string | null)
      .filter((id): id is string => Boolean(id)),
  );

  return Response.json({
    data: (data ?? []).map((r) =>
      toInvoice(
        r as Record<string, unknown>,
        clientNameMap.get(String(r.client_id ?? "")),
        itemsByInvoice[r.id as string] ?? [],
      ),
    ),
    total: count ?? 0,
    page,
    pageSize,
  });
}

// ── POST /api/invoices ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const tenantId = getTenantIdFromRequest(request);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const supabase = createServerSupabaseClient();
  const body = await request.json();

  if (!body.client && !body.clientId) {
    return Response.json(
      { error: "A client must be specified." },
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

  const discountPercentage = Number(body.discountPercentage ?? 0);
  const discountAmount = Math.round((subtotal * discountPercentage) / 100);
  const taxableAmount = subtotal - discountAmount;

  const gstRate = Number(body.gstRate ?? 18);
  const gstAmount = Math.round((taxableAmount * gstRate) / 100);

  const tdsRate = Number(body.tdsRate ?? 0);
  const tdsAmount = Math.round((taxableAmount * tdsRate) / 100);

  const tcsRate = Number(body.tcsRate ?? 0);
  const tcsAmount = Math.round((taxableAmount * tcsRate) / 100);

  const totalAmount = taxableAmount + gstAmount + tdsAmount + tcsAmount;

  const invoiceNumberMode =
    body.invoiceNumberMode === "manual" ? "manual" : "auto";
  const manualInvoiceId = String(body.manualInvoiceId ?? "").trim();

  const id =
    invoiceNumberMode === "manual" && manualInvoiceId
      ? manualInvoiceId
      : await nextInvoiceId(supabase, tenantId, body.invoiceSeries ?? {});

  const { count: duplicateCount } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("id", id);

  if ((duplicateCount ?? 0) > 0) {
    return Response.json(
      {
        error:
          invoiceNumberMode === "manual"
            ? `Invoice number ${id} already exists. Please choose a different value.`
            : `Generated invoice number ${id} already exists. Please adjust series settings and try again.`,
      },
      { status: 409 },
    );
  }

  const defaultDueDate = new Date(Date.now() + 30 * 86400 * 1000)
    .toISOString()
    .split("T")[0];

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      id,
      client_id: body.clientId ?? null,
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
      date: body.date,
      due_date: body.dueDate ?? defaultDueDate,
      status: body.status ?? "Draft",
      notes: body.notes ?? null,
      shipping_address: body.shippingAddress ?? null,
      currency: body.currency ?? "INR",
      tax_type: body.taxType ?? "CGST_SGST",
      signatory_name: body.signatoryName ?? null,
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
    const { data: items, error: itemsErr } = await supabase
      .from("invoice_items")
      .insert(
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
      )
      .select();

    if (itemsErr) {
      return Response.json({ error: itemsErr.message }, { status: 500 });
    }
    savedItems = (items ?? []) as Record<string, unknown>[];
  }

  const clientNameMap = await getClientNameMap(
    supabase,
    tenantId,
    [String((invoice as Record<string, unknown>).client_id ?? "")].filter(
      Boolean,
    ),
  );

  return Response.json(
    {
      data: toInvoice(
        invoice as Record<string, unknown>,
        clientNameMap.get(
          String((invoice as Record<string, unknown>).client_id ?? ""),
        ),
        savedItems,
      ),
    },
    { status: 201 },
  );
}
