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

  const search = searchParams.get("search");
  let query = supabase
    .from("vendors")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId);
  if (search) query = query.ilike("name", `%${search}%`);

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

  if (!body.name) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("vendors")
    .insert({
      name: body.name,
      company: body.company ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      address: body.address ?? null,
      gst_number: body.gstNumber ?? null,
      pan_number: body.panNumber ?? null,
      bank_name: body.bankName ?? null,
      bank_account: body.bankAccount ?? null,
      ifsc_code: body.ifscCode ?? null,
      payment_terms: body.paymentTerms ?? 30,
      notes: body.notes ?? null,
      tenant_id: tenantId,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data }, { status: 201 });
}
