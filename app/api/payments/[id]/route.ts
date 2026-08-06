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

// ── GET /api/payments/[id] ────────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const tenantId = getTenantIdFromRequest(_req);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { data: payment, error } = await supabase
    .from("payments")
    .select(
      "*, clients(id, name, company), invoices(id, total_amount, paid_amount)",
    )
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (error) {
    return Response.json(
      { error: error.message },
      { status: error.code === "PGRST116" ? 404 : 500 },
    );
  }

  return Response.json({ data: toPayment(payment as Record<string, unknown>) });
}
