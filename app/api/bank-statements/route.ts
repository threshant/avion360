import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const tenantId = getTenantIdFromRequest(request);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const supabase = createServerSupabaseClient();
  const { searchParams } = request.nextUrl;
  const { parsePagination } = await import("@/lib/pagination");
  const { page, pageSize, from, to } = parsePagination(searchParams);

  const bankAccountId = searchParams.get("bankAccountId");
  const reconciled = searchParams.get("reconciled");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  let query = supabase
    .from("bank_statements")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId);

  if (bankAccountId) query = query.eq("bank_account_id", bankAccountId);
  if (reconciled !== null)
    query = query.eq("is_reconciled", reconciled === "true");
  if (dateFrom) query = query.gte("date", dateFrom);
  if (dateTo) query = query.lte("date", dateTo);

  const { data, error, count } = await query
    .order("date", { ascending: false })
    .range(from, to);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data: data ?? [], total: count ?? 0, page, pageSize });
}

export async function POST(request: NextRequest) {
  const tenantId = getTenantIdFromRequest(request);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const supabase = createServerSupabaseClient();
  const body = await request.json();

  if (!body.bankAccountId || !body.date) {
    return Response.json(
      { error: "bankAccountId and date are required" },
      { status: 400 },
    );
  }

  const rows = Array.isArray(body.entries) ? body.entries : [body];

  const inserts = rows.map((r: Record<string, unknown>) => ({
    bank_account_id: body.bankAccountId ?? r.bankAccountId,
    date: r.date ?? body.date,
    description: r.description ?? null,
    debit: Number(r.debit ?? 0),
    credit: Number(r.credit ?? 0),
    balance: r.balance !== undefined ? Number(r.balance) : null,
    reference_no: r.referenceNo ?? null,
    tenant_id: tenantId,
  }));

  const { data, error } = await supabase
    .from("bank_statements")
    .insert(inserts)
    .select();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data }, { status: 201 });
}
