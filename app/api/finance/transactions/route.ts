import {
  getTenantIdFromRequest,
  verifySuperAdminAuth,
} from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { getSystemSetting } from "@/services/systemSettingsService";
import { NextRequest, NextResponse } from "next/server";

async function isCreditFlowEnabled(tenantId: string): Promise<boolean> {
  try {
    const s = await getSystemSetting("credit_flow_enabled", tenantId);
    return s ? s.value === "true" : true;
  } catch {
    return true;
  }
}

// ── GET /api/finance/transactions ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const tenantId = getTenantIdFromRequest(request);
  if (!tenantId) {
    return NextResponse.json(
      { error: "Tenant context required" },
      { status: 400 },
    );
  }
  const supabase = createServerSupabaseClient();
  const { searchParams } = request.nextUrl;

  const type = searchParams.get("type");
  const month = searchParams.get("month");
  const status = searchParams.get("status");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  // enforce a maximum pageSize of 50 to limit payloads
  const pageSize = Math.min(
    50,
    Math.max(1, Number(searchParams.get("pageSize") ?? 20)),
  );
  const from = (page - 1) * pageSize;

  const creditEnabled = await isCreditFlowEnabled(tenantId);

  let query = supabase
    .from("transactions")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .order("date", { ascending: false })
    .range(from, from + pageSize - 1);

  // Hide credit entries when feature is disabled
  if (!creditEnabled) {
    query = query.eq("is_credit", false);
  }

  if (type && type !== "All Types") {
    query = query.eq("type", type);
  }
  if (status && status !== "All Statuses") {
    query = query.eq("status", status);
  }
  if (month && month !== "All Months") {
    const parts = month.split(" ");
    if (parts.length === 2) {
      const monthNames: Record<string, string> = {
        January: "01",
        February: "02",
        March: "03",
        April: "04",
        May: "05",
        June: "06",
        July: "07",
        August: "08",
        September: "09",
        October: "10",
        November: "11",
        December: "12",
      };
      const mm = monthNames[parts[0]];
      const yyyy = parts[1];
      if (mm && yyyy) {
        query = query
          .gte("date", `${yyyy}-${mm}-01`)
          .lt("date", `${yyyy}-${String(Number(mm) + 1).padStart(2, "0")}-01`);
      }
    }
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Calculate actual max pages based on total count
  const totalCount = count ?? 0;
  const maxPages = Math.ceil(totalCount / pageSize) || 1;
  const actualPage = Math.max(1, Math.min(page, maxPages));

  return NextResponse.json({
    data,
    total: totalCount,
    page: actualPage,
    pageSize,
    maxPages,
    creditEnabled,
  });
}

// ── POST /api/finance/transactions ────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const tenantId = getTenantIdFromRequest(request);
  if (!tenantId) {
    return NextResponse.json(
      { error: "Tenant context required" },
      { status: 400 },
    );
  }
  const supabase = createServerSupabaseClient();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, party, amount, date, status, details, invoice_id, is_credit } =
    body as Record<string, unknown>;

  if (!type || !party || !amount || !date) {
    return NextResponse.json(
      { error: "type, party, amount, date are required" },
      { status: 400 },
    );
  }

  // Block credit inserts when the feature is disabled
  if (is_credit === true) {
    const creditEnabled = await isCreditFlowEnabled(tenantId);
    if (!creditEnabled) {
      return NextResponse.json(
        { error: "Credit flow is currently disabled by admin." },
        { status: 403 },
      );
    }
  }

  const { count } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  const id = `TXN${String((count ?? 0) + 1).padStart(3, "0")}`;

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      id,
      type,
      party,
      amount: Number(amount),
      date,
      status: status ?? "Pending",
      details: details ?? null,
      invoice_id: invoice_id ?? null,
      is_credit: is_credit === true,
      tenant_id: tenantId,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

// ── DELETE /api/finance/transactions ──────────────────────────────────────────
// Bulk delete all transaction data — Super Admin only

export async function DELETE(request: NextRequest) {
  const tenantId = getTenantIdFromRequest(request);
  if (!tenantId) {
    return NextResponse.json(
      { error: "Tenant context required" },
      { status: 400 },
    );
  }
  const { isValid, error: authError } = await verifySuperAdminAuth(request);

  if (!isValid) {
    return NextResponse.json(
      { error: authError || "Unauthorized" },
      { status: 403 },
    );
  }

  const supabase = createServerSupabaseClient();

  try {
    // 1. Delete all bank statements (which may reference transactions)
    const { error: bankError } = await supabase
      .from("bank_statements")
      .delete()
      .eq("tenant_id", tenantId);

    if (bankError) {
      return NextResponse.json({ error: bankError.message }, { status: 500 });
    }

    // 2. Delete all transactions
    const { error: txnError } = await supabase
      .from("transactions")
      .delete()
      .eq("tenant_id", tenantId);

    if (txnError) {
      return NextResponse.json({ error: txnError.message }, { status: 500 });
    }

    // 3. Delete all vendor bills
    const { error: billError } = await supabase
      .from("vendor_bills")
      .delete()
      .eq("tenant_id", tenantId);

    if (billError) {
      return NextResponse.json({ error: billError.message }, { status: 500 });
    }

    // 4. Delete all proforma invoices (items will cascade delete)
    const { error: proformaError } = await supabase
      .from("proforma_invoices")
      .delete()
      .eq("tenant_id", tenantId);

    if (proformaError) {
      return NextResponse.json(
        { error: proformaError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message:
        "All finance data (transactions, bills, proforma invoices) has been deleted successfully.",
    });
  } catch (err) {
    console.error("Bulk delete error:", err);
    return NextResponse.json(
      { error: "Internal server error during bulk delete" },
      { status: 500 },
    );
  }
}
