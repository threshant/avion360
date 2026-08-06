import { getUserIdFromRequest } from "@/lib/auth-middleware";
import {
  buildLoginResponse,
  createLoginNextResponse,
} from "@/lib/auth-session";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { resolveActiveTenantForUser } from "@/lib/tenant-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const tenantId = String(body?.tenantId || "").trim();
    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId is required" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const resolvedTenantId = await resolveActiveTenantForUser(
      supabase,
      { id: user.id as string, name: user.name as string },
      tenantId,
    );

    if (resolvedTenantId !== tenantId) {
      return NextResponse.json(
        { error: "You do not belong to this tenant" },
        { status: 403 },
      );
    }

    const response = buildLoginResponse(user, resolvedTenantId);
    return createLoginNextResponse(response);
  } catch (error) {
    console.error("Tenant switch failed:", error);
    return NextResponse.json(
      { error: "Failed to switch tenant" },
      { status: 500 },
    );
  }
}
