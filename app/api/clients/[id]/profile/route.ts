import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import type {
  Client,
  ClientProfile,
  ClientProfileInvoice,
  ClientProfilePayment,
  ClientProfileProforma,
  ClientProfileQuotation,
} from "@/types/client";
import { NextRequest } from "next/server";

function toClient(row: Record<string, unknown>): Client {
  return {
    id: row.id as string,
    name: row.name as string,
    email: (row.email as string) ?? undefined,
    phone: (row.phone as string) ?? undefined,
    company: (row.company as string) ?? undefined,
    address: (row.address as string) ?? undefined,
    gstNumber: (row.gst_number as string) ?? undefined,
    businessType: (row.business_type as Client["businessType"]) ?? undefined,
    gstRate: (row.gst_rate as number) ?? undefined,
    gstAvailable: (row.gst_available as boolean) ?? true,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const tenantId = getTenantIdFromRequest(_req);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { data: clientRow, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (clientError || !clientRow) {
    return Response.json(
      { error: clientError?.message ?? "Client not found" },
      { status: 404 },
    );
  }

  const [invoiceRows, quotationRows, proformaRows, paymentRows] =
    await Promise.all([
      supabase
        .from("invoices")
        .select("id, date, due_date, status, total_amount, paid_amount")
        .eq("client_id", id)
        .eq("tenant_id", tenantId)
        .order("date", { ascending: false }),
      supabase
        .from("quotations")
        .select("id, date, valid_until, status, total_amount")
        .eq("client_id", id)
        .eq("tenant_id", tenantId)
        .order("date", { ascending: false }),
      supabase
        .from("proforma_invoices")
        .select("id, date, valid_until, status, total_amount")
        .eq("client_id", id)
        .eq("tenant_id", tenantId)
        .order("date", { ascending: false }),
      supabase
        .from("payments")
        .select("id, invoice_id, amount, payment_date, mode, reference, status")
        .eq("client_id", id)
        .eq("tenant_id", tenantId)
        .order("payment_date", { ascending: false }),
    ]);

  if (
    invoiceRows.error ||
    quotationRows.error ||
    proformaRows.error ||
    paymentRows.error
  ) {
    return Response.json(
      {
        error:
          invoiceRows.error?.message ||
          quotationRows.error?.message ||
          proformaRows.error?.message ||
          paymentRows.error?.message ||
          "Failed to load client profile",
      },
      { status: 500 },
    );
  }

  const invoices: ClientProfileInvoice[] = (invoiceRows.data ?? []).map(
    (row) => {
      const totalAmount = Number(row.total_amount ?? 0);
      const paidAmount = Number(row.paid_amount ?? 0);
      return {
        id: row.id as string,
        date: row.date as string,
        dueDate: (row.due_date as string) ?? undefined,
        status: row.status as ClientProfileInvoice["status"],
        totalAmount,
        paidAmount,
        remaining: Math.max(0, totalAmount - paidAmount),
      };
    },
  );

  const quotations: ClientProfileQuotation[] = (quotationRows.data ?? []).map(
    (row) => ({
      id: row.id as string,
      quotationNumber:
        ((row as Record<string, unknown>).quotation_number as string) ??
        (row.id as string),
      date: row.date as string,
      validUntil: row.valid_until as string,
      status: row.status as ClientProfileQuotation["status"],
      totalAmount: Number(row.total_amount ?? 0),
    }),
  );

  const proformas: ClientProfileProforma[] = (proformaRows.data ?? []).map(
    (row) => ({
      id: row.id as string,
      date: row.date as string,
      validUntil: (row.valid_until as string) ?? undefined,
      status: row.status as ClientProfileProforma["status"],
      totalAmount: Number(row.total_amount ?? 0),
    }),
  );

  const payments: ClientProfilePayment[] = (paymentRows.data ?? []).map(
    (payment) => ({
      id: payment.id as string,
      referenceId: (payment.invoice_id as string) ?? undefined,
      source: payment.invoice_id ? "invoice" : "on_account",
      date: payment.payment_date as string,
      amount: Number(payment.amount ?? 0),
      mode: (payment.mode as string) ?? undefined,
      reference: (payment.reference as string) ?? undefined,
      status: payment.status === "Reversed" ? "Reversed" : "Completed",
    }),
  );

  const activeInvoices = invoices.filter(
    (invoice) => invoice.status !== "Cancelled",
  );
  const totalInvoiced = activeInvoices.reduce(
    (sum, invoice) => sum + invoice.totalAmount,
    0,
  );
  const invoiceCollected = payments
    .filter((payment) => payment.source === "invoice")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const totalPaid = payments
    .filter((payment) => payment.status === "Completed")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const creditBalance = payments
    .filter(
      (payment) =>
        payment.source === "on_account" && payment.status === "Completed",
    )
    .reduce((sum, payment) => sum + payment.amount, 0);
  const totalOutstanding = Math.max(0, totalInvoiced - invoiceCollected);

  const lastActivityAt = [
    ...invoices.map((invoice) => invoice.date),
    ...quotations.map((quotation) => quotation.date),
    ...proformas.map((proforma) => proforma.date),
    ...payments.map((payment) => payment.date),
  ]
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

  const response: ClientProfile = {
    client: toClient(clientRow as Record<string, unknown>),
    overview: {
      invoiceCount: activeInvoices.length,
      quotationCount: quotations.length,
      proformaCount: proformas.length,
      totalInvoiced,
      totalPaid,
      totalOutstanding,
      creditBalance,
      lastActivityAt,
    },
    invoices,
    quotations,
    proformas,
    payments,
  };

  return Response.json({ data: response });
}
