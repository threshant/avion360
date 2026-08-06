import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import type { Expense } from "@/types/expense";
import { NextRequest } from "next/server";

const EXPENSE_CATEGORIES = [
  "Rent & Utilities",
  "Office Supplies",
  "Equipment",
  "Salaries",
  "Travel",
  "Marketing",
  "Software & Subscriptions",
  "Legal & Professional",
  "Other",
];

const EXPENSE_PAYMENT_MODES = [
  "Cash",
  "Bank Transfer",
  "UPI",
  "Cheque",
  "Other",
];

type RouteContext = { params: Promise<{ id: string }> };

// ── helpers ──────────────────────────────────────────────────────────────────

function toExpense(row: Record<string, unknown>): Expense {
  return {
    id: row.id as string,
    category: row.category as Expense["category"],
    party: row.party as string,
    amount: Number(row.amount),
    expenseDate: row.expense_date as string,
    paymentMode: row.payment_mode as Expense["paymentMode"],
    reference: (row.reference as string) ?? undefined,
    description: (row.description as string) ?? undefined,
    status: row.status as Expense["status"],
    transactionId: (row.transaction_id as string) ?? undefined,
    createdBy: (row.created_by as string) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: (row.updated_at as string) ?? undefined,
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

// ── GET /api/expenses/[id] ────────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const tenantId = getTenantIdFromRequest(_req);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { data: expense, error } = await supabase
    .from("expenses")
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

  return Response.json({ data: toExpense(expense as Record<string, unknown>) });
}

// ── PATCH /api/expenses/[id] ──────────────────────────────────────────────────

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const tenantId = getTenantIdFromRequest(request);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  if (!isUuid(id)) {
    return Response.json({ error: "Invalid expense id." }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const category = String(body.category ?? "").trim();
  const party = String(body.party ?? "").trim();
  const amount = Number(body.amount);
  const paymentMode = String(body.paymentMode ?? "").trim();
  const reference = String(body.reference ?? "").trim() || null;
  const description = String(body.description ?? "").trim() || null;
  const expenseDate = String(body.expenseDate ?? "").trim() || null;

  if (category && !EXPENSE_CATEGORIES.includes(category)) {
    return Response.json(
      {
        error: `Invalid expense category. Choose one of: ${EXPENSE_CATEGORIES.join(", ")}.`,
      },
      { status: 400 },
    );
  }
  if (!party) {
    return Response.json(
      { error: "A party (paid to) must be specified." },
      { status: 400 },
    );
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return Response.json(
      { error: "Expense amount must be a positive number." },
      { status: 400 },
    );
  }
  if (paymentMode && !EXPENSE_PAYMENT_MODES.includes(paymentMode)) {
    return Response.json(
      {
        error: `Invalid payment mode. Choose one of: ${EXPENSE_PAYMENT_MODES.join(", ")}.`,
      },
      { status: 400 },
    );
  }
  if (expenseDate && Number.isNaN(new Date(expenseDate).getTime())) {
    return Response.json({ error: "Invalid expense date." }, { status: 400 });
  }

  const { data: existingExpense, error: existingError } = await supabase
    .from("expenses")
    .select("id, transaction_id")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (existingError || !existingExpense) {
    return Response.json({ error: "Expense not found" }, { status: 404 });
  }

  const { data: expense, error } = await supabase
    .from("expenses")
    .update({
      category,
      party,
      amount,
      expense_date: expenseDate || null,
      payment_mode: paymentMode,
      reference,
      description,
    })
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error || !expense) {
    return Response.json(
      { error: String(error?.message ?? "Failed to update expense") },
      { status: 500 },
    );
  }

  if (existingExpense.transaction_id) {
    const details =
      description || `${category} expense${party ? ` - ${party}` : ""}`;
    const { error: txnError } = await supabase
      .from("transactions")
      .update({
        party,
        amount,
        date: expenseDate || null,
        details,
      })
      .eq("id", existingExpense.transaction_id)
      .eq("tenant_id", tenantId);

    if (txnError) {
      return Response.json({ error: txnError.message }, { status: 500 });
    }
  }

  return Response.json({ data: toExpense(expense as Record<string, unknown>) });
}

// ── DELETE /api/expenses/[id] ─────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const tenantId = getTenantIdFromRequest(_req);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  if (!isUuid(id)) {
    return Response.json({ error: "Invalid expense id." }, { status: 400 });
  }

  const { data: expense, error: fetchError } = await supabase
    .from("expenses")
    .select("id, transaction_id")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (fetchError || !expense) {
    return Response.json({ error: "Expense not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (expense.transaction_id) {
    await supabase
      .from("transactions")
      .delete()
      .eq("id", expense.transaction_id)
      .eq("tenant_id", tenantId);
  }

  return Response.json({ success: true });
}
