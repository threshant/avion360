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

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("memberships")
      .select("id, tenant_id, role, created_at, organizations(name, plan_tier)")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    const activeTenantId = getTenantIdFromRequest(request);

    return NextResponse.json({
      activeTenantId,
      data:
        (data || []).map((membership) => ({
          id: membership.id,
          tenantId: membership.tenant_id,
          role: membership.role,
          createdAt: membership.created_at,
          organizationName:
            (membership.organizations as { name?: string } | null)?.name ??
            "Organization",
          planTier:
            (membership.organizations as { plan_tier?: string } | null)
              ?.plan_tier ?? null,
        })) || [],
    });
  } catch (error) {
    console.error("Failed to load tenant memberships:", error);
    return NextResponse.json(
      { error: "Failed to load tenant memberships" },
      { status: 500 },
    );
  }
}
