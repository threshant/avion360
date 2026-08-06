import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/rbac/roles/[id]/permissions/[permissionId] - Assign a permission to a role
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; permissionId: string }> },
) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }
    const { id, permissionId } = await params;
    const supabase = createServerSupabaseClient();
    const roleId = id;

    // Check if user is super_admin
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: currentUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", userData.user.id)
      .eq("tenant_id", tenantId)
      .single();

    if (currentUser?.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only super admin can assign permissions" },
        { status: 403 },
      );
    }

    const { data: rolePermission, error } = await supabase
      .from("role_permissions")
      .insert([
        { role_id: roleId, permission_id: permissionId, tenant_id: tenantId },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        id: rolePermission.id,
        roleId: rolePermission.role_id,
        permissionId: rolePermission.permission_id,
        createdAt: rolePermission.created_at,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error assigning permission:", error);
    return NextResponse.json(
      { error: "Failed to assign permission" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/rbac/roles/[id]/permissions/[permissionId] - Revoke a permission from a role
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; permissionId: string }> },
) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }
    const { id, permissionId } = await params;
    const supabase = createServerSupabaseClient();
    const roleId = id;

    // Check if user is super_admin
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: currentUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", userData.user.id)
      .eq("tenant_id", tenantId)
      .single();

    if (currentUser?.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only super admin can revoke permissions" },
        { status: 403 },
      );
    }

    const { error } = await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", roleId)
      .eq("tenant_id", tenantId)
      .eq("permission_id", permissionId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error revoking permission:", error);
    return NextResponse.json(
      { error: "Failed to revoke permission" },
      { status: 500 },
    );
  }
}
