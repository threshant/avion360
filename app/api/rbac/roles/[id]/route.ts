import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/rbac/roles/[id] - Get a specific role with its permissions
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

    const { data: role, error: roleError } = await supabase
      .from("roles")
      .select("*")
      .eq("id", roleId)
      .eq("tenant_id", tenantId)
      .single();

    if (roleError) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    const { data: permissions, error: permError } = await supabase
      .from("role_permissions")
      .select("permissions(*)")
      .eq("role_id", roleId)
      .eq("tenant_id", tenantId);

    if (permError) {
      console.error("Error fetching permissions:", permError);
    }

    return NextResponse.json({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.is_system,
      isActive: role.is_active,
      createdAt: role.created_at,
      updatedAt: role.updated_at,
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
    });
  } catch (error) {
    console.error("Error fetching role:", error);
    return NextResponse.json(
      { error: "Failed to fetch role" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/rbac/roles/[id] - Update a role
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
        { error: "Only super admin can update roles" },
        { status: 403 },
      );
    }

    // Check if role is system role
    const { data: role } = await supabase
      .from("roles")
      .select("is_system")
      .eq("id", roleId)
      .eq("tenant_id", tenantId)
      .single();

    if (role?.is_system) {
      return NextResponse.json(
        { error: "Cannot modify system roles" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { name, description, isActive } = body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (isActive !== undefined) updates.is_active = isActive;

    const { data: updated, error } = await supabase
      .from("roles")
      .update(updates)
      .eq("id", roleId)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      isSystem: updated.is_system,
      isActive: updated.is_active,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    });
  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/rbac/roles/[id] - Delete a role
 */
export async function DELETE(
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
        { error: "Only super admin can delete roles" },
        { status: 403 },
      );
    }

    // Check if role is system role
    const { data: role } = await supabase
      .from("roles")
      .select("is_system")
      .eq("id", roleId)
      .eq("tenant_id", tenantId)
      .single();

    if (role?.is_system) {
      return NextResponse.json(
        { error: "Cannot delete system roles" },
        { status: 403 },
      );
    }

    const { error } = await supabase
      .from("roles")
      .delete()
      .eq("id", roleId)
      .eq("tenant_id", tenantId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting role:", error);
    return NextResponse.json(
      { error: "Failed to delete role" },
      { status: 500 },
    );
  }
}
