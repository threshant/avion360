import {
  getTenantIdFromRequest,
  getUserIdFromRequest,
} from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
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
      .select("id, name, email, phone, department")
      .eq("id", userId)
      .eq("tenant_id", tenantId)
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Failed to load profile settings:", error);
    return NextResponse.json(
      { error: "Failed to load profile settings" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const tenantId = getTenantIdFromRequest(request);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const supabase = createServerSupabaseClient();

    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = String(body.name || "").trim();
    if (body.phone !== undefined) patch.phone = String(body.phone || "").trim();
    if (body.department !== undefined)
      patch.department = String(body.department || "").trim();

    const { data, error } = await supabase
      .from("users")
      .update(patch)
      .eq("id", userId)
      .eq("tenant_id", tenantId)
      .select("id, name, email, phone, department")
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Failed to save profile settings:", error);
    return NextResponse.json(
      { error: "Failed to save profile settings" },
      { status: 500 },
    );
  }
}
