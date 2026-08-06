import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import type { ClientBalance, ClientBalanceInvoice } from "@/types/payment";
import { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

// ── GET /api/clients/[id]/balance ────────────────────────────────────────────
// Outstanding balance + credit summary for a client.

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const tenantId = getTenantIdFromRequest(_req);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const [clientRow, invoiceRows, paymentRows] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, company")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .single(),
    supabase
      .from("invoices")
      .select("id, total_amount, paid_amount, status")
      .eq("client_id", id)
      .eq("tenant_id", tenantId),
    supabase
      .from("payments")
      .select("amount, invoice_id, status")
      .eq("client_id", id)
      .eq("tenant_id", tenantId)
      .eq("status", "Completed"),
  ]);

  if (clientRow.error || !clientRow.data) {
    return Response.json({ error: "Client not found" }, { status: 404 });
  }

  if (invoiceRows.error || paymentRows.error) {
    return Response.json(
      {
        error:
          invoiceRows.error?.message ||
          paymentRows.error?.message ||
          "Failed to load balance",
      },
      { status: 500 },
    );
  }

  const activeInvoices = (invoiceRows.data ?? []).filter(
    (invoice) => invoice.status !== "Cancelled",
  );

  const totalInvoiced = activeInvoices.reduce(
    (sum, invoice) => sum + Number(invoice.total_amount ?? 0),
    0,
  );

  const invoiceCollected = (paymentRows.data ?? []).reduce(
    (sum, payment) =>
      payment.invoice_id ? sum + Number(payment.amount ?? 0) : sum,
    0,
  );

  const creditBalance = (paymentRows.data ?? []).reduce(
    (sum, payment) =>
      !payment.invoice_id ? sum + Number(payment.amount ?? 0) : sum,
    0,
  );

  const totalCollected = invoiceCollected + creditBalance;
  const totalOutstanding = Math.max(0, totalInvoiced - invoiceCollected);

  const invoices: ClientBalanceInvoice[] = activeInvoices.map((invoice) => {
    const totalAmount = Number(invoice.total_amount ?? 0);
    const paidAmount = Number(invoice.paid_amount ?? 0);
    return {
      id: invoice.id as string,
      totalAmount,
      paidAmount,
      remaining: Math.max(0, totalAmount - paidAmount),
      status: invoice.status as ClientBalanceInvoice["status"],
    };
  });

  const client = clientRow.data as Record<string, unknown>;
  const name = String(client.name ?? "").trim();
  const company = String(client.company ?? "").trim();

  const balance: ClientBalance = {
    clientId: id,
    clientName: name || company || id,
    totalInvoiced,
    invoiceCollected,
    creditBalance,
    totalCollected,
    totalOutstanding,
    activeInvoiceCount: invoices.length,
    paidInvoiceCount: invoices.filter((inv) => inv.status === "Paid").length,
    partiallyPaidInvoiceCount: invoices.filter(
      (inv) => inv.status === "Partially Paid",
    ).length,
    unpaidInvoiceCount: invoices.filter((inv) => inv.status !== "Paid").length,
    invoices,
  };

  return Response.json({ data: balance });
}
