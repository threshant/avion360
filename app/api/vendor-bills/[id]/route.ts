import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest } from "next/server";

export async function PATCH(
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

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (body.status !== undefined) updates.status = body.status;
  if (body.paymentDate !== undefined) updates.payment_date = body.paymentDate;
  if (body.paymentRef !== undefined) updates.payment_ref = body.paymentRef;
  if (body.description !== undefined) updates.description = body.description;

  const { data, error } = await supabase
    .from("vendor_bills")
    .update(updates)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select("*, vendors(name, company)")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data });
}
