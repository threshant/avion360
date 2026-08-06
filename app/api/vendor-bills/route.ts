import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest } from "next/server";

async function nextBillId(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  tenantId: string,
) {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("vendor_bills")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  const n = (count ?? 0) + 1;
  return `BILL-${year}-${String(n).padStart(3, "0")}`;
}

export async function GET(request: NextRequest) {
  const tenantId = getTenantIdFromRequest(request);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const supabase = createServerSupabaseClient();
  const { searchParams } = request.nextUrl;
  const { parsePagination } = await import("@/lib/pagination");
  const { page, pageSize, from, to } = parsePagination(searchParams);

  const status = searchParams.get("status");
  const vendorId = searchParams.get("vendorId");
  const category = searchParams.get("category");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  let query = supabase
    .from("vendor_bills")
    .select("*, vendors(name, company)", { count: "exact" })
    .eq("tenant_id", tenantId);

  if (status) query = query.eq("status", status);
  if (vendorId) query = query.eq("vendor_id", vendorId);
  if (category) query = query.eq("category", category);
  if (dateFrom) query = query.gte("bill_date", dateFrom);
  if (dateTo) query = query.lte("bill_date", dateTo);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
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

  if (!body.vendorId) {
    return Response.json({ error: "vendorId is required" }, { status: 400 });
  }

  const id = await nextBillId(supabase, tenantId);
  const gstAmount = Number(body.gstAmount ?? 0);
  const amount = Number(body.amount ?? 0);
  const totalAmount = amount + gstAmount;

  const { data, error } = await supabase
    .from("vendor_bills")
    .insert({
      id,
      vendor_id: body.vendorId,
      amount,
      gst_amount: gstAmount,
      total_amount: totalAmount,
      bill_date: body.billDate,
      due_date: body.dueDate ?? null,
      status: body.status ?? "Unpaid",
      category: body.category ?? "Other",
      description: body.description ?? null,
      created_by: body.createdBy ?? null,
      tenant_id: tenantId,
    })
    .select("*, vendors(name, company)")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data }, { status: 201 });
}
