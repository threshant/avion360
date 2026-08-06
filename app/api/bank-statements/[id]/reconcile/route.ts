import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest } from "next/server";

// POST /api/bank-statements/[id]/reconcile
// Links a bank statement entry to a system transaction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = getTenantIdFromRequest(request);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("bank_statements")
    .update({
      transaction_id: body.transactionId ?? null,
      is_reconciled: true,
      reconciled_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data });
}

// DELETE /api/bank-statements/[id]/reconcile — unreconcile
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = getTenantIdFromRequest(_request);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("bank_statements")
    .update({
      transaction_id: null,
      is_reconciled: false,
      reconciled_at: null,
    })
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data });
}
