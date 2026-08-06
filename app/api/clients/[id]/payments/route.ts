import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import type { Payment } from "@/types/payment";
import { NextRequest } from "next/server";

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

type RouteContext = { params: Promise<{ id: string }> };

// ── GET /api/clients/[id]/payments ───────────────────────────────────────────

export async function GET(request: NextRequest, { params }: RouteContext) {
  const tenantId = getTenantIdFromRequest(request);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  const { parsePagination } = await import("@/lib/pagination");
  const { page, pageSize, from, to } = parsePagination(
    request.nextUrl.searchParams,
  );

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (clientError || !client) {
    return Response.json({ error: "Client not found" }, { status: 404 });
  }

  const { data, error, count } = await supabase
    .from("payments")
    .select(
      "*, clients(id, name, company), invoices(id, total_amount, paid_amount)",
      {
        count: "exact",
      },
    )
    .eq("client_id", id)
    .eq("tenant_id", tenantId)
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
