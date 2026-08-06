import {
  getTenantIdFromRequest,
  getUserIdFromRequest,
} from "@/lib/auth-middleware";
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

// ── GET /api/expenses ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const tenantId = getTenantIdFromRequest(request);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const supabase = createServerSupabaseClient();
  const { searchParams } = request.nextUrl;

  const category = searchParams.get("category");
  const paymentMode = searchParams.get("paymentMode");
  const status = searchParams.get("status");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const search = searchParams.get("search");
  const { parsePagination } = await import("@/lib/pagination");
  const { page, pageSize, from, to } = parsePagination(searchParams);

  let query = supabase
    .from("expenses")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId);

  if (category && category !== "All Categories") {
    query = query.eq("category", category);
  }
  if (paymentMode && paymentMode !== "All Modes") {
    query = query.eq("payment_mode", paymentMode);
  }
  if (status && status !== "All Statuses") {
    query = query.eq("status", status);
  }
  if (dateFrom) query = query.gte("expense_date", dateFrom);
  if (dateTo) query = query.lte("expense_date", dateTo);
  if (search) {
    query = query.or(
      `party.ilike.%${search}%,reference.ilike.%${search}%,description.ilike.%${search}%`,
    );
  }

  const { data, error, count } = await query
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    data: (data ?? []).map((row) => toExpense(row as Record<string, unknown>)),
    total: count ?? 0,
    page,
    pageSize,
  });
}

// ── POST /api/expenses ────────────────────────────────────────────────────────

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

  const category = String(body.category ?? "").trim();
  const party = String(body.party ?? "").trim();
  const amount = Number(body.amount);
  const paymentMode = String(body.paymentMode ?? "Cash").trim();
  const reference = String(body.reference ?? "").trim() || null;
  const description = String(body.description ?? "").trim() || null;
  const expenseDate = String(body.expenseDate ?? "").trim() || null;

  if (!EXPENSE_CATEGORIES.includes(category)) {
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
  if (!EXPENSE_PAYMENT_MODES.includes(paymentMode)) {
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

  const createdBy =
    getUserIdFromRequest(request) ??
    (String(body.createdBy ?? "").trim() || null);

  const { data: expense, error } = await supabase
    .from("expenses")
    .insert({
      category,
      party,
      amount,
      expense_date: expenseDate || null,
      payment_mode: paymentMode,
      reference,
      description,
      status: "Completed",
      created_by: createdBy,
      tenant_id: tenantId,
    })
    .select()
    .single();

  if (error || !expense) {
    return Response.json(
      { error: String(error?.message ?? "Failed to record expense") },
      { status: 500 },
    );
  }

  const txnId = `EXP-${expense.id}`;
  const details =
    description || `${category} expense${party ? ` - ${party}` : ""}`;

  const { error: txnError } = await supabase.from("transactions").insert({
    id: txnId,
    type: "Expense",
    party,
    amount,
    date: expenseDate || null,
    status: "Completed",
    details,
    is_credit: false,
    tenant_id: tenantId,
  });

  if (txnError) {
    await supabase
      .from("expenses")
      .delete()
      .eq("id", expense.id)
      .eq("tenant_id", tenantId);
    return Response.json({ error: txnError.message }, { status: 500 });
  }

  const { data: updatedExpense, error: expenseUpdateError } = await supabase
    .from("expenses")
    .update({ transaction_id: txnId })
    .eq("id", expense.id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (expenseUpdateError || !updatedExpense) {
    return Response.json(
      {
        error: String(
          expenseUpdateError?.message ?? "Failed to finalize expense",
        ),
      },
      { status: 500 },
    );
  }

  return Response.json({ data: toExpense(updatedExpense) }, { status: 201 });
}
