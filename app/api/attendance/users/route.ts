import {
  getTenantIdFromRequest,
  getUserIdFromRequest,
} from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const requesterId = getUserIdFromRequest(request);
    if (!requesterId) {
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
      .select("id, name, department, designation")
      .eq("is_active", true)
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      data: (data || []).map((user) => ({
        id: user.id,
        name: user.name,
        department: user.department || "-",
        designation: user.designation || "-",
      })),
    });
  } catch (error) {
    console.error("Failed to fetch attendance users:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance users" },
      { status: 500 },
    );
  }
}
