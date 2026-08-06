import {
  getTenantIdFromRequest,
  getUserIdFromRequest,
} from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import type { MembershipRole } from "@/lib/tenant-auth";
import { hasTenantRole } from "@/lib/tenant-auth";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ROLES: MembershipRole[] = ["admin", "staff"];

export async function POST(request: NextRequest) {
  try {
    const actorUserId = getUserIdFromRequest(request);
    const tenantId = getTenantIdFromRequest(request);

    if (!actorUserId || !tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const email = String(body?.email || "")
      .trim()
      .toLowerCase();
    const role = String(body?.role || "staff").trim() as MembershipRole;

    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json(
        { error: "role must be admin or staff" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();

    const isTenantAdmin = await hasTenantRole(supabase, actorUserId, tenantId, [
      "owner",
      "admin",
    ]);

    if (!isTenantAdmin) {
      return NextResponse.json(
        { error: "Only tenant owner/admin can invite users" },
        { status: 403 },
      );
    }

    const { data: targetUser, error: targetUserError } = await supabase
      .from("users")
      .select("id, email")
      .eq("email", email)
      .single();

    if (targetUserError || !targetUser) {
      return NextResponse.json(
        {
          error:
            "User not found. Create the user account first, then invite to tenant.",
        },
        { status: 404 },
      );
    }

    const { data: membership, error: membershipError } = await supabase
      .from("memberships")
      .upsert(
        {
          user_id: targetUser.id,
          tenant_id: tenantId,
          role,
        },
        { onConflict: "user_id,tenant_id" },
      )
      .select("id, user_id, tenant_id, role, created_at")
      .single();

    if (membershipError || !membership) {
      throw membershipError ?? new Error("Failed to upsert membership");
    }

    return NextResponse.json({
      data: {
        id: membership.id,
        userId: membership.user_id,
        tenantId: membership.tenant_id,
        role: membership.role,
        createdAt: membership.created_at,
      },
    });
  } catch (error) {
    console.error("Tenant invite failed:", error);
    return NextResponse.json(
      { error: "Failed to invite user" },
      { status: 500 },
    );
  }
}
