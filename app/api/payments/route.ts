import {
  getTenantIdFromRequest,
  getUserIdFromRequest,
} from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import type { Payment } from "@/types/payment";
import { NextRequest } from "next/server";

const PAYMENT_MODES = ["Cash", "Bank Transfer", "UPI", "Cheque", "Other"];

// ─── helpers ──────────────────────────────────────────────────────────────────

function clientName(client?: unknown): string | undefined {
  const c = client as Record<string, unknown> | null;
  if (!c) return undefined;
  const name = String(c.name ?? "").trim();
  const company = String(c.company ?? "").trim();
  return name || company || undefined;
}

function toPayment(row: Record<string, unknown>): Payment {
  const invoice = (row.invoices as Record<string, unknown> | null) ?? null;
  const total = invoice ? Number(invoice.total_amount ?? 0) : undefined;
  const paid = invoice ? Number(invoice.paid_amount ?? 0) : undefined;
  return {
    id: row.id as string,
    clientId: row.client_id as string,
    invoiceId: (row.invoice_id as string) ?? undefined,
    amount: Number(row.amount),
    paymentDate: row.payment_date as string,
    mode: row.mode as Payment["mode"],
    reference: (row.reference as string) ?? undefined,
    notes: (row.notes as string) ?? undefined,
    status: row.status as Payment["status"],
    createdBy: (row.created_by as string) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: (row.updated_at as string) ?? undefined,
    clientName: clientName(row.clients),
    invoiceTotalAmount: total,
    invoicePaidAmount: paid,
    invoiceRemaining:
      total !== undefined && paid !== undefined ? total - paid : undefined,
  };
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

// ── GET /api/payments ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const tenantId = getTenantIdFromRequest(request);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const supabase = createServerSupabaseClient();
  const { searchParams } = request.nextUrl;

  const clientId = searchParams.get("clientId");
  const invoiceId = searchParams.get("invoiceId");
  const mode = searchParams.get("mode");
  const status = searchParams.get("status");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const search = searchParams.get("search");
  const { parsePagination } = await import("@/lib/pagination");
  const { page, pageSize, from, to } = parsePagination(searchParams);

  let query = supabase
    .from("payments")
    .select(
      "*, clients(id, name, company), invoices(id, total_amount, paid_amount)",
      { count: "exact" },
    )
    .eq("tenant_id", tenantId);

  if (clientId) query = query.eq("client_id", clientId);
  if (invoiceId) query = query.eq("invoice_id", invoiceId);
  if (mode && mode !== "All Modes") query = query.eq("mode", mode);
  if (status && status !== "All Statuses") query = query.eq("status", status);
  if (dateFrom) query = query.gte("payment_date", dateFrom);
  if (dateTo) query = query.lte("payment_date", dateTo);
  if (search) {
    query = query.or(
      `reference.ilike.%${search}%,notes.ilike.%${search}%,invoice_id.ilike.%${search}%`,
    );
  }

  const { data, error, count } = await query
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    data: (data ?? []).map((row) => toPayment(row as Record<string, unknown>)),
    total: count ?? 0,
    page,
    pageSize,
  });
}

// ── POST /api/payments ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const tenantId = getTenantIdFromRequest(request);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const supabase = createServerSupabaseClient();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const clientId = String(body.clientId ?? "").trim();
  const invoiceId = String(body.invoiceId ?? "").trim() || null;
  const amount = Number(body.amount);
  const mode = String(body.mode ?? "Cash").trim();
  const reference = String(body.reference ?? "").trim() || null;
  const notes = String(body.notes ?? "").trim() || null;
  const paymentDate = String(body.paymentDate ?? "").trim() || today();

  if (!clientId) {
    return Response.json(
      { error: "A client must be specified." },
      { status: 400 },
    );
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return Response.json(
      { error: "Payment amount must be a positive number." },
      { status: 400 },
    );
  }
  if (!PAYMENT_MODES.includes(mode)) {
    return Response.json(
      {
        error: `Invalid payment mode. Choose one of: ${PAYMENT_MODES.join(", ")}.`,
      },
      { status: 400 },
    );
  }
  if (Number.isNaN(new Date(paymentDate).getTime())) {
    return Response.json({ error: "Invalid payment date." }, { status: 400 });
  }

  // Validation aid for clear error messages; the RPC is the authoritative guard.
  if (invoiceId) {
    const { data: invoice } = await supabase
      .from("invoices")
      .select("id, client_id, status")
      .eq("id", invoiceId)
      .eq("tenant_id", tenantId)
      .single();

    if (!invoice) {
      return Response.json(
        { error: `Invoice ${invoiceId} not found.` },
        { status: 404 },
      );
    }
    if (String(invoice.client_id ?? "") !== clientId) {
      return Response.json(
        { error: "The invoice does not belong to the selected client." },
        { status: 400 },
      );
    }
    if (invoice.status === "Draft" || invoice.status === "Cancelled") {
      return Response.json(
        {
          error: `Cannot record a payment against a ${invoice.status} invoice.`,
        },
        { status: 400 },
      );
    }
  }

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("tenant_id", tenantId)
    .single();

  if (!client) {
    return Response.json({ error: "Client not found." }, { status: 404 });
  }

  const createdBy =
    getUserIdFromRequest(request) ??
    (String(body.createdBy ?? "").trim() || null);

  const { data: payment, error } = await supabase.rpc("record_payment", {
    p_client_id: clientId,
    p_invoice_id: invoiceId,
    p_amount: amount,
    p_payment_date: paymentDate,
    p_mode: mode,
    p_reference: reference,
    p_notes: notes,
    p_created_by: createdBy,
  });

  if (error) {
    const message = String(error.message ?? "Failed to record payment");
    if (
      /exceeds the remaining balance|Draft\/Cancelled|not found/i.test(message)
    ) {
      return Response.json({ error: message }, { status: 409 });
    }
    return Response.json({ error: message }, { status: 500 });
  }

  const { data: full } = await supabase
    .from("payments")
    .select(
      "*, clients(id, name, company), invoices(id, total_amount, paid_amount)",
    )
    .eq("id", (payment as Record<string, unknown>).id as string)
    .eq("tenant_id", tenantId)
    .single();

  return Response.json(
    { data: toPayment(full as Record<string, unknown>) },
    { status: 201 },
  );
}
