import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const tenantId = getTenantIdFromRequest(request);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("bank_accounts")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const tenantId = getTenantIdFromRequest(request);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const supabase = createServerSupabaseClient();
  const body = await request.json();

  if (!body.accountName || !body.bankName || !body.accountNumber) {
    return Response.json(
      { error: "accountName, bankName, and accountNumber are required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("bank_accounts")
    .insert({
      account_name: body.accountName,
      bank_name: body.bankName,
      account_number: body.accountNumber,
      ifsc_code: body.ifscCode ?? null,
      account_type: body.accountType ?? "Current",
      opening_balance: Number(body.openingBalance ?? 0),
      tenant_id: tenantId,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data }, { status: 201 });
}
