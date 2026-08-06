import {
  getTenantIdFromRequest,
  getUserIdFromRequest,
} from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const currentUserId = getUserIdFromRequest(request);
    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const tenantId = getTenantIdFromRequest(request);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("is_active", true)
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ data: data || [] }, { status: 200 });
  } catch (error) {
    console.error("Error fetching assignees:", error);
    return NextResponse.json(
      { error: "Failed to fetch assignees" },
      { status: 500 },
    );
  }
}
