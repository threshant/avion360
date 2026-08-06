import {
  getTenantIdFromRequest,
  getUserIdFromRequest,
} from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

const TABLE_NAME = "tasks";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const tenantId = getTenantIdFromRequest(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }
    const supabase = createServerSupabaseClient();
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        status: "Completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (error) {
      console.error("[PATCH /complete] Supabase error:", JSON.stringify(error));
      throw error;
    }

    return NextResponse.json(data);
  } catch (err: any) {
    const message =
      err?.message || err?.error_description || JSON.stringify(err);
    console.error("[PATCH /complete] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
