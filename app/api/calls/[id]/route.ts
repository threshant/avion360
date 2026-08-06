import {
  getTenantIdFromRequest,
  getUserIdFromRequest,
} from "@/lib/auth-middleware";
import { mapDbRowToCallRecord } from "@/lib/calls";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const requesterId = getUserIdFromRequest(req);
    if (!requesterId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const tenantId = getTenantIdFromRequest(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }

    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid call id" }, { status: 400 });
    }

    const body = (await req.json()) as {
      notes?: string;
      assigned_to_user_id?: string | null;
      assigned_to_name?: string | null;
    };

    const updates: Record<string, unknown> = {};

    if (typeof body.notes === "string") {
      updates.notes = body.notes.trim();
    }

    if ("assigned_to_user_id" in body) {
      updates.assigned_to_user_id = body.assigned_to_user_id ?? null;
    }

    if ("assigned_to_name" in body) {
      updates.assigned_to_name = body.assigned_to_name ?? null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No updatable fields provided" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("calls")
      .update(updates)
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (error) throw error;
    if (!data)
      return NextResponse.json({ error: "Call not found" }, { status: 404 });

    console.log(`[PATCH /api/calls/${id}] Updated:`, Object.keys(updates));
    return NextResponse.json(mapDbRowToCallRecord(data));
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to update call";
    console.error(`[PATCH /api/calls/[id]]`, message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
