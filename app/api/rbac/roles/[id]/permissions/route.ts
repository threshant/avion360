import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/rbac/roles/[id]/permissions - Get permissions for a specific role
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }
    const { id } = await params;
    const supabase = createServerSupabaseClient();
    const roleId = id;

    const { data: permissions, error } = await supabase
      .from("role_permissions")
      .select("permissions(*)")
      .eq("role_id", roleId)
      .eq("tenant_id", tenantId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        permissions:
          permissions?.map((rp: any) => ({
            id: rp.permissions.id,
            key: rp.permissions.key,
            label: rp.permissions.label,
            description: rp.permissions.description,
            icon: rp.permissions.icon,
            path: rp.permissions.path,
            category: rp.permissions.category,
            orderNum: rp.permissions.order_num,
            isActive: rp.permissions.is_active,
            createdAt: rp.permissions.created_at,
            updatedAt: rp.permissions.updated_at,
          })) || [],
      },
    });
  } catch (error) {
    console.error("Error fetching role permissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch role permissions" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/rbac/roles/[id]/permissions - Update permissions for a role (replace all)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }
    const { id } = await params;
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
        { error: "Only super admin can update role permissions" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { permissionIds } = body;

    if (!Array.isArray(permissionIds)) {
      return NextResponse.json(
        { error: "permissionIds must be an array" },
        { status: 400 },
      );
    }

    // Delete existing permissions
    await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", roleId)
      .eq("tenant_id", tenantId);

    // Insert new permissions
    if (permissionIds.length > 0) {
      const { error } = await supabase.from("role_permissions").insert(
        permissionIds.map((permissionId) => ({
          role_id: roleId,
          permission_id: permissionId,
          tenant_id: tenantId,
        })),
      );

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating role permissions:", error);
    return NextResponse.json(
      { error: "Failed to update role permissions" },
      { status: 500 },
    );
  }
}
