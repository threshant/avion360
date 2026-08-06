import {
  getTenantIdFromRequest,
  getUserIdFromRequest,
} from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { role } = body;

    if (!role) {
      return Response.json({ error: "Role is required" }, { status: 400 });
    }

    // Get current user ID from request
    const currentUserId = getUserIdFromRequest(request);
    if (!currentUserId) {
      return Response.json(
        { error: "Unauthorized: Not authenticated" },
        { status: 401 },
      );
    }
    const tenantId = getTenantIdFromRequest(request);
    if (!tenantId) {
      return Response.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();

    // Check if current user is super_admin
    const { data: currentUser, error: currentUserErr } = await supabase
      .from("users")
      .select("role")
      .eq("id", currentUserId)
      .eq("tenant_id", tenantId)
      .single();

    if (currentUserErr || currentUser?.role !== "super_admin") {
      return Response.json(
        { error: "Forbidden: Only super admin can change user roles" },
        { status: 403 },
      );
    }

    // Verify the role being assigned exists
    const { data: roleExists } = await supabase
      .from("roles")
      .select("id")
      .eq("name", role)
      .eq("tenant_id", tenantId)
      .single();

    if (!roleExists) {
      return Response.json(
        { error: "Invalid role specified" },
        { status: 400 },
      );
    }

    // Update user role
    const { data: updatedUser, error } = await supabase
      .from("users")
      .update({ role })
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .select("id, name, email, role")
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      message: "User role updated successfully",
      data: updatedUser,
    });
  } catch (err) {
    console.error("Error updating user role:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
